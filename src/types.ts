export interface Table {
  id: string;
  name: string;
  isActive: boolean;
  songsSungCount: number;
  pendingSongCount?: number;
  lastSungAt?: number;
  joinedAt?: number;
}

export interface SongRequest {
  id: string;
  tableId: string;
  singerName: string;
  songTitle: string;
  artistName: string;
  status: 'pending' | 'singing' | 'sung' | 'no_show' | 'removed';
  createdAt: number;
  completedAt?: number;
  logicalRound?: number;
}

export interface KaraokeState {
  tables: Table[];
  queue: SongRequest[];
  isSessionActive: boolean;
}
