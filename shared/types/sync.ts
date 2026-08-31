import type { Note, FolderRecord, SyncMutation } from './note';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncConflict {
  originalNoteId: string;
  forkedNote: Note;
  reason: string;
}

export interface SyncPushDTO {
  mutations: SyncMutation[];
}

export interface SyncPushResponse {
  acceptedIds: string[];
  conflicts: SyncConflict[];
  serverTimestamp: string;
}

export interface SyncPullResponse {
  notes: Note[];
  folders: FolderRecord[];
  serverTimestamp: string;
}
