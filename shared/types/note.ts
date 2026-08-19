export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CreateNoteDTO {
  title: string;
  content?: string;
  tags?: string[];
}

export interface UpdateNoteDTO {
  title?: string;
  content?: string;
  tags?: string[];
}

export type SaveStatus = 'idle' | 'saved' | 'saving' | 'unsaved' | 'error';
