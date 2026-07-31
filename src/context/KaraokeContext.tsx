import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Table, SongRequest, KaraokeState } from '../types';
import { getNextSongs, getProjectedRound } from '../utils/fairQueue';
import { chunkItems } from '../utils/chunkItems';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  writeBatch,
  getDocs,
  deleteField,
  runTransaction
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

interface KaraokeContextType extends KaraokeState {
  addSongRequest: (request: Omit<SongRequest, 'id' | 'status' | 'createdAt'>) => Promise<number>;
  markAsSung: (songId: string) => Promise<void>;
  markNoShow: (songId: string) => Promise<void>;
  toggleTableStatus: (tableId: string) => Promise<void>;
  addTable: (name: string) => Promise<void>;
  fairQueue: SongRequest[];
  stats: {
    pending: number;
    completed: number;
    noShows: number;
    turnsConsumed: number;
    averageWaitMinutes: number;
    activeTables: number;
  };
  isAuthenticated: boolean;
  user: FirebaseUser | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isSessionActive: boolean;
  toggleSession: () => Promise<void>;
  resetSystem: () => Promise<void>;
}

const KaraokeContext = createContext<KaraokeContextType | undefined>(undefined);

// Initial 35 tables helper
const INITIAL_TABLES: Table[] = Array.from({ length: 35 }, (_, i) => ({
  id: `mesa-${i + 1}`,
  name: `Mesa ${i + 1}`,
  isActive: true,
  songsSungCount: 0,
  pendingSongCount: 0,
}));

export const KaraokeProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Sync Tables and Queue
  useEffect(() => {
    console.log("Setting up Firestore listeners...");
    const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => {
      const tablesData = snap.docs.map(doc => doc.data() as Table);
      console.log(`Received ${tablesData.length} tables from Firestore`);
      
      if (tablesData.length > 0) {
        setTables(tablesData.sort((a, b) => {
          const numA = parseInt(a.id.split('-')[1]) || 0;
          const numB = parseInt(b.id.split('-')[1]) || 0;
          return numA - numB;
        }));
      }
      setTablesLoaded(true);
    }, (err) => {
      console.error("Tables listener error:", err);
      setTablesLoaded(true);
    });

    const unsubQueue = onSnapshot(
      collection(db, 'songRequests'), 
      (snap) => {
        const queueData = snap.docs.map(doc => doc.data() as SongRequest);
        console.log(`Received ${queueData.length} song requests from Firestore`);
        // Sort locally to avoid index requirements
        setQueue(queueData.sort((a, b) => a.createdAt - b.createdAt));
        setQueueLoaded(true);
      }, (err) => {
        console.error("Queue listener error:", err);
        setQueueLoaded(true);
      }
    );

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setIsSessionActive(snap.data().isSessionActive);
      }
      setSettingsLoaded(true);
    }, (err) => {
      console.error("Settings listener error:", err);
      setSettingsLoaded(true);
    });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      console.log("Auth state changed:", u?.email || "Guest");
      try {
        if (!u) {
          setUser(null);
          setIsAdminUser(false);
          return;
        }

        const adminSnapshot = await getDoc(doc(db, 'admins', u.uid));
        if (!adminSnapshot.exists()) {
          setUser(null);
          setIsAdminUser(false);
          await signOut(auth);
          return;
        }

        setUser(u);
        setIsAdminUser(true);
      } catch (error) {
        console.error("Admin authorization check failed:", error);
        setUser(null);
        setIsAdminUser(false);
      } finally {
        setAuthLoaded(true);
      }
    });

    return () => {
      unsubTables();
      unsubQueue();
      unsubSettings();
      unsubAuth();
    };
  }, []);

  const bootstrapTables = async () => {
    const batch = writeBatch(db);
    INITIAL_TABLES.forEach(table => {
      const tableRef = doc(db, 'tables', table.id);
      batch.set(tableRef, table);
    });
    await batch.commit();
  };

  const addSongRequest = async (req: Omit<SongRequest, 'id' | 'status' | 'createdAt'>) => {
    const localPendingCount = queue.filter(
      request => request.tableId === req.tableId && request.status === 'pending'
    ).length;
    if (localPendingCount >= 3) {
      throw new Error('QUEUE_LIMIT');
    }

    const now = Date.now();
    const projectedRound = getProjectedRound(queue, req.tableId, now);
    const id = `req-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const tableRef = doc(db, 'tables', req.tableId);
    const settingsRef = doc(db, 'settings', 'system');
    const requestRef = doc(db, 'songRequests', id);

    await runTransaction(db, async transaction => {
      const tableSnapshot = await transaction.get(tableRef);
      const settingsSnapshot = await transaction.get(settingsRef);

      if (!tableSnapshot.exists() || tableSnapshot.data().isActive !== true) {
        throw new Error('TABLE_INACTIVE');
      }
      if (settingsSnapshot.exists() && settingsSnapshot.data().isSessionActive === false) {
        throw new Error('SESSION_INACTIVE');
      }

      const pendingSongCount = Math.max(
        tableSnapshot.data().pendingSongCount || 0,
        localPendingCount
      );
      if (pendingSongCount >= 3) {
        throw new Error('QUEUE_LIMIT');
      }

      transaction.update(tableRef, {
        pendingSongCount: pendingSongCount + 1,
        ...(!tableSnapshot.data().joinedAt ? { joinedAt: now } : {}),
      });
      transaction.set(requestRef, { ...req, id, status: 'pending', createdAt: now });
    });

    return projectedRound;
  };

  const markAsSung = async (songId: string) => {
    if (fairQueue[0]?.id !== songId) {
      throw new Error('OUT_OF_ORDER');
    }

    const now = Date.now();
    const songRef = doc(db, 'songRequests', songId);
    await runTransaction(db, async transaction => {
      const songSnapshot = await transaction.get(songRef);
      if (!songSnapshot.exists() || songSnapshot.data().status !== 'pending') return;

      const tableRef = doc(db, 'tables', songSnapshot.data().tableId);
      const tableSnapshot = await transaction.get(tableRef);
      if (!tableSnapshot.exists()) throw new Error('TABLE_NOT_FOUND');

      transaction.update(tableRef, {
        songsSungCount: (tableSnapshot.data().songsSungCount || 0) + 1,
        pendingSongCount: Math.max(0, (tableSnapshot.data().pendingSongCount || 0) - 1),
        lastSungAt: now,
      });
      transaction.update(songRef, { status: 'sung', completedAt: now });
    });
  };

  const markNoShow = async (songId: string) => {
    if (fairQueue[0]?.id !== songId) {
      throw new Error('OUT_OF_ORDER');
    }

    const now = Date.now();
    const songRef = doc(db, 'songRequests', songId);
    await runTransaction(db, async transaction => {
      const songSnapshot = await transaction.get(songRef);
      if (!songSnapshot.exists() || songSnapshot.data().status !== 'pending') return;

      const tableRef = doc(db, 'tables', songSnapshot.data().tableId);
      const tableSnapshot = await transaction.get(tableRef);
      if (!tableSnapshot.exists()) throw new Error('TABLE_NOT_FOUND');

      transaction.update(tableRef, {
        songsSungCount: (tableSnapshot.data().songsSungCount || 0) + 1,
        pendingSongCount: Math.max(0, (tableSnapshot.data().pendingSongCount || 0) - 1),
      });
      transaction.update(songRef, { status: 'no_show', completedAt: now });
    });
  };

  const resetSystem = async () => {
    try {
      // Keep every commit below Firestore's 500-operation batch ceiling.
      // A long event can easily exceed that limit when the full history is reset.
      const safeBatchSize = 450;

      const songSnap = await getDocs(collection(db, 'songRequests'));
      for (const songChunk of chunkItems(songSnap.docs, safeBatchSize)) {
        const songBatch = writeBatch(db);
        songChunk.forEach(songDoc => songBatch.delete(songDoc.ref));
        await songBatch.commit();
      }

      const tablesSnap = await getDocs(collection(db, 'tables'));
      for (const tableChunk of chunkItems(tablesSnap.docs, safeBatchSize)) {
        const tableBatch = writeBatch(db);
        tableChunk.forEach(tableDoc => {
          tableBatch.update(tableDoc.ref, {
            songsSungCount: 0,
            pendingSongCount: 0,
            lastSungAt: deleteField(),
            joinedAt: deleteField()
          });
        });
        await tableBatch.commit();
      }
      console.log("System reset successfully");
    } catch (error) {
      console.error("Error resetting system:", error);
      throw error;
    }
  };

  const toggleTableStatus = async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const tableRef = doc(db, 'tables', tableId);
    await updateDoc(tableRef, { isActive: !table.isActive });
  };

  const addTable = async (name: string) => {
    const id = `mesa-${Date.now()}`;
    const newTable: Table = {
      id,
      name,
      isActive: true,
      songsSungCount: 0,
      pendingSongCount: 0,
    };
    await setDoc(doc(db, 'tables', id), newTable);
  };

  const toggleSession = async () => {
    const newStatus = !isSessionActive;
    await setDoc(doc(db, 'settings', 'system'), { isSessionActive: newStatus }, { merge: true });
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    try {
      console.log("Attempting login for:", cleanEmail);
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const adminSnapshot = await getDoc(doc(db, 'admins', credential.user.uid));
      if (!adminSnapshot.exists()) {
        await signOut(auth);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error("Login attempt failed. Code:", error.code, "Message:", error.message);
      
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      if (userCredential.user) {
        const adminSnapshot = await getDoc(doc(db, 'admins', userCredential.user.uid));
        if (!adminSnapshot.exists()) {
          await signOut(auth);
          return { success: false, error: 'Esta cuenta no tiene permisos de administrador.' };
        }
        return { success: true };
      }
      return { success: false, error: 'No se pudo obtener información del usuario.' };
    } catch (error: any) {
      console.error("Google Login error:", error);
      return { success: false, error: `Error con Google: ${error.code}` };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const fairQueue = getNextSongs(queue, tables);
  const isLoading = !tablesLoaded || !queueLoaded || !settingsLoaded || !authLoaded;

  const processedRequests = queue.filter(
    request => (request.status === 'sung' || request.status === 'no_show' || request.status === 'removed')
      && request.completedAt
  );
  const averageWaitMinutes = processedRequests.length === 0
    ? 0
    : Math.round(
        processedRequests.reduce(
          (total, request) => total + ((request.completedAt || request.createdAt) - request.createdAt),
          0
        ) / processedRequests.length / 60000
      );

  const stats = {
    pending: queue.filter(r => r.status === 'pending').length,
    completed: queue.filter(r => r.status === 'sung').length,
    noShows: queue.filter(r => r.status === 'no_show').length,
    turnsConsumed: queue.filter(r => r.status === 'sung' || r.status === 'no_show' || r.status === 'removed').length,
    averageWaitMinutes,
    activeTables: tables.filter(t => t.isActive).length,
  };

  return (
    <KaraokeContext.Provider value={{
      tables,
      queue,
      addSongRequest,
      markAsSung,
      markNoShow,
      toggleTableStatus,
      addTable,
      fairQueue,
      stats,
      isAuthenticated: !!user && isAdminUser,
      user,
      login,
      logout,
      isLoading,
      isSessionActive,
      toggleSession,
      resetSystem,
    }}>
      {children}
    </KaraokeContext.Provider>
  );
};

export const useKaraoke = () => {
  const context = useContext(KaraokeContext);
  if (!context) throw new Error('useKaraoke must be used within KaraokeProvider');
  return context;
};
