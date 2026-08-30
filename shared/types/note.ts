export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deletedAt?: string | null;
  syncStatus?: 'synced' | 'pending' | 'conflict';
}

export interface FolderRecord {
  name: string;
  deletedAt?: string | null;
  syncStatus?: 'synced' | 'pending';
}

export interface SyncMutation {
  id: string;
  entityType: 'note' | 'folder';
  entityId: string;
  action: 'upsert' | 'delete';
  data: Partial<Note> | Partial<FolderRecord>;
  baseUpdatedAt?: string | null;
  createdAt: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

export interface CreateNoteDTO {
  title: string;
  content?: string;
  tags?: string[];
  folder?: string;
}

export interface UpdateNoteDTO {
  title?: string;
  content?: string;
  tags?: string[];
  folder?: string;
}

export interface FolderInfo {
  name: string;
  noteCount: number;
}

export interface FolderTreeNode {
  name: string; // Base name (e.g. "Frontend")
  path: string; // Full path (e.g. "Projects/Frontend")
  depth: number; // 0 for root folder, 1 for subfolder, etc.
  noteCount: number; // Direct notes in this folder
  children: FolderTreeNode[];
}

export interface CreateFolderDTO {
  name: string;
}

export interface RenameFolderDTO {
  newName?: string;
  targetParent?: string;
}

export interface MoveFolderDTO {
  targetParent?: string;
}

export type SaveStatus = 'idle' | 'saved' | 'saving' | 'unsaved' | 'error';
