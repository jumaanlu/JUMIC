import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Table, SongRequest, KaraokeState } from '../types';
import { getNextSongs } from '../utils/fairQueue';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  doc, 
  updateDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  deleteField
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

interface KaraokeContextType extends KaraokeState {
  addSongRequest: (request: Omit<SongRequest, 'id' | 'status' | 'createdAt'>) => void;
  markAsSung: (songId: string) => void;
  removeSong: (songId: string) => void;
  toggleTableStatus: (tableId: string) => void;
  addTable: (name: string) => void;
  fairQueue: SongRequest[];
  stats: {
    pending: number;
    completed: number;
    activeTables: number;
  };
  isAuthenticated: boolean;
  user: FirebaseUser | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isSessionActive: boolean;
  toggleSession: () => void;
  resetSystem: () => Promise<void>;
}

const KaraokeContext = createContext<KaraokeContextType | undefined>(undefined);

// Initial 35 tables helper
const INITIAL_TABLES: Table[] = Array.from({ length: 35 }, (_, i) => ({
  id: `mesa-${i + 1}`,
  name: `Mesa ${i + 1}`,
  isActive: true,
  songsSungCount: 0,
}));

export const KaraokeProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync Tables and Queue
  useEffect(() => {
    console.log("Setting up Firestore listeners...");
    const unsubTables = onSnapshot(collection(db, 'tables'), (snap) => {
      const tablesData = snap.docs.map(doc => doc.data() as Table);
      console.log(`Received ${tablesData.length} tables from Firestore`);
      
      // If no tables in DB, bootstrap them (only for dev/first run)
      if (tablesData.length === 0) {
        bootstrapTables();
      } else {
        setTables(tablesData.sort((a, b) => {
          const numA = parseInt(a.id.split('-')[1]) || 0;
          const numB = parseInt(b.id.split('-')[1]) || 0;
          return numA - numB;
        }));
      }
      // If we already have a queue snap, we can stop loading. 
      // But actually, it's safer to just set it here too.
      setIsLoading(false);
    }, (err) => {
      console.error("Tables listener error:", err);
      setIsLoading(false);
    });

    const unsubQueue = onSnapshot(
      collection(db, 'songRequests'), 
      (snap) => {
        const queueData = snap.docs.map(doc => doc.data() as SongRequest);
        console.log(`Received ${queueData.length} song requests from Firestore`);
        // Sort locally to avoid index requirements
        setQueue(queueData.sort((a, b) => a.createdAt - b.createdAt));
        setIsLoading(false);
      }, (err) => {
        console.error("Queue listener error:", err);
        setIsLoading(false);
      }
    );

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setIsSessionActive(snap.data().isSessionActive);
      } else {
        // Init settings if they don't exist
        setDoc(doc(db, 'settings', 'system'), { isSessionActive: true });
      }
    });

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u?.email || "Guest");
      setUser(u);
    });

    return () => {
      unsubTables();
      unsubQueue();
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
    const tableId = req.tableId;
    const table = tables.find(t => t.id === tableId);
    const now = Date.now();

    // Si la mesa no tiene joinedAt, se lo ponemos ahora (su primer request)
    if (table && !table.joinedAt) {
      const tableRef = doc(db, 'tables', table.id);
      await updateDoc(tableRef, { joinedAt: now });
    }

    // Robust ID generation
    const id = `req-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const newReq: SongRequest = {
      ...req,
      id,
      status: 'pending',
      createdAt: now,
    };
    console.log("Adding song request to Firestore:", newReq);
    await setDoc(doc(db, 'songRequests', id), newReq);
  };

  const markAsSung = async (songId: string) => {
    const request = queue.find(s => s.id === songId);
    if (!request) return;

    const now = Date.now();
    const table = tables.find(t => t.id === request.tableId);
    if (table) {
      const tableRef = doc(db, 'tables', table.id);
      await updateDoc(tableRef, { 
        songsSungCount: table.songsSungCount + 1,
        lastSungAt: now 
      });
    }

    const songRef = doc(db, 'songRequests', songId);
    await updateDoc(songRef, { status: 'sung', completedAt: now });
  };

  const removeSong = async (songId: string) => {
    const songRef = doc(db, 'songRequests', songId);
    await updateDoc(songRef, { status: 'removed' });
  };

  const resetSystem = async () => {
    try {
      const batch = writeBatch(db);
      
      // 1. Delete all song requests
      const songSnap = await getDocs(collection(db, 'songRequests'));
      songSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. Reset counts for all tables
      const tablesSnap = await getDocs(collection(db, 'tables'));
      tablesSnap.docs.forEach((d) => {
        batch.update(d.ref, { 
          songsSungCount: 0,
          lastSungAt: deleteField(),
          joinedAt: deleteField()
        });
      });

      await batch.commit();
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
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      return true;
    } catch (error: any) {
      console.error("Login attempt failed. Code:", error.code, "Message:", error.message);
      
      // Handle the new admin credentials provided by user
      if (cleanEmail === 'sistemas@clubdelago.com.mx' && cleanPass === 'Clago12345*') {
        try {
          console.log("Admin credentials detected. Attempting auto-registration...");
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          
          if (userCredential.user) {
            console.log("Admin user created successfully.");
            const adminRef = doc(db, 'admins', userCredential.user.uid);
            await setDoc(adminRef, { 
              email: cleanEmail, 
              role: 'admin',
              createdAt: Date.now()
            });
            return true;
          }
        } catch (regError: any) {
          console.error("Auto-registration error:", regError.code, regError.message);
          // If the user already exists (auth/email-already-in-use), but login failed above, 
          // password must be wrong in Firebase Auth database compared to user input.
          if (regError.code === 'auth/operation-not-allowed') {
             // This is the critical part - telling the user via console/ui what to fix
             throw new Error("ENABLE_EMAIL_AUTH");
          }
        }
      }
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      if (userCredential.user) {
        // Automatically make them admin for easier access in this environment
        console.log("Google Login success. Setting admin doc for UID:", userCredential.user.uid);
        const adminRef = doc(db, 'admins', userCredential.user.uid);
        await setDoc(adminRef, { 
          email: userCredential.user.email, 
          role: 'admin',
          createdAt: Date.now()
        }, { merge: true });
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

  const stats = {
    pending: queue.filter(r => r.status === 'pending').length,
    completed: queue.filter(r => r.status === 'sung').length,
    activeTables: tables.filter(t => t.isActive).length,
  };

  return (
    <KaraokeContext.Provider value={{
      tables,
      queue,
      addSongRequest,
      markAsSung,
      removeSong,
      toggleTableStatus,
      addTable,
      fairQueue,
      stats,
      isAuthenticated: !!user,
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
