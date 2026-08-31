import { Dexie, type Table } from 'dexie';
import type {
  Note,
  CreateNoteDTO,
  UpdateNoteDTO,
  FolderInfo,
  FolderRecord,
  SyncMutation,
  SyncMeta,
} from '../../shared/types/note';

export type { Note, FolderRecord, SyncMutation, SyncMeta };

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<FolderRecord, string>;
  mutationQueue!: Table<SyncMutation, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor(databaseName = 'MarkdownNotesDB') {
    super(databaseName);
    this.version(1).stores({
      notes: 'id, title, folder, *tags, createdAt, updatedAt',
      folders: 'name',
    });

    this.version(2).stores({
      notes: 'id, title, folder, *tags, createdAt, updatedAt, deletedAt, syncStatus',
      folders: 'name, deletedAt, syncStatus',
      mutationQueue: 'id, entityType, entityId, action, createdAt',
      syncMeta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('notes').toCollection().modify((note) => {
        if (!note.syncStatus) note.syncStatus = 'pending';
        if (note.deletedAt === undefined) note.deletedAt = null;
      });
      await tx.table('folders').toCollection().modify((folder) => {
        if (!folder.syncStatus) folder.syncStatus = 'pending';
        if (folder.deletedAt === undefined) folder.deletedAt = null;
      });
    });
  }

  async clearAllUserData(): Promise<void> {
    await this.transaction('rw', [this.notes, this.folders, this.mutationQueue, this.syncMeta], async () => {
      await this.notes.clear();
      await this.folders.clear();
      await this.mutationQueue.clear();
      await this.syncMeta.clear();
    });
  }
}

export const db = new NotesDatabase();

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Normalizes folder path by trimming segments, collapsing multiple slashes,
 * and stripping leading/trailing slashes.
 */
export function normalizeFolderPath(path?: string): string {
  if (!path || typeof path !== 'string') return '';
  return path
    .split('/')
    .map((seg) => seg.trim())
    .filter(Boolean)
    .join('/');
}

export async function getAllNotes(): Promise<Note[]> {
  const notes = await db.notes.toArray();
  return notes
    .filter((n) => !n.deletedAt)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getNoteById(id: string): Promise<Note | null> {
  const note = await db.notes.get(id);
  if (!note || note.deletedAt) {
    return null;
  }
  return { ...note };
}

export async function getAllFolders(): Promise<FolderInfo[]> {
  const folderRecords = (await db.folders.toArray()).filter((f) => !f.deletedAt);
  const allFolderNames = new Set<string>(folderRecords.map((f) => f.name));
  const allNotes = (await db.notes.toArray()).filter((n) => !n.deletedAt);

  for (const note of allNotes) {
    if (note.folder) {
      const norm = normalizeFolderPath(note.folder);
      if (norm) {
        const segs = norm.split('/');
        let cur = '';
        for (const seg of segs) {
          cur = cur ? `${cur}/${seg}` : seg;
          allFolderNames.add(cur);
        }
      }
    }
  }

  const sortedNames = Array.from(allFolderNames).sort((a, b) => a.localeCompare(b));

  return sortedNames.map((name) => ({
    name,
    noteCount: allNotes.filter((n) => n.folder === name).length,
  }));
}

export async function createFolder(path: string): Promise<boolean> {
  const normalized = normalizeFolderPath(path);
  if (!normalized) {
    return false;
  }
  const existing = await db.folders.get(normalized);
  if (existing && !existing.deletedAt) {
    return false;
  }

  const now = new Date().toISOString();
  // Auto-register intermediate parent paths
  const segments = normalized.split('/');
  let currentPath = '';

  await db.transaction('rw', [db.folders, db.mutationQueue], async () => {
    for (let i = 0; i < segments.length; i++) {
      currentPath = currentPath ? `${currentPath}/${segments[i]}` : segments[i]!;
      const folderRec: FolderRecord = {
        name: currentPath,
        deletedAt: null,
        syncStatus: 'pending',
      };
      await db.folders.put(folderRec);
      await db.mutationQueue.add({
        id: generateId(),
        entityType: 'folder',
        entityId: currentPath,
        action: 'upsert',
        data: folderRec,
        baseUpdatedAt: null,
        createdAt: now,
      });
    }
  });

  return true;
}

export async function renameFolder(oldPath: string, newPath: string): Promise<boolean> {
  const normOld = normalizeFolderPath(oldPath);
  const normNew = normalizeFolderPath(newPath);

  if (!normOld || !normNew) {
    return false;
  }

  const folderRecords = (await db.folders.toArray()).filter((f) => !f.deletedAt);
  const folderNames = new Set<string>(folderRecords.map((f) => f.name));
  const allNotes = (await db.notes.toArray()).filter((n) => !n.deletedAt);

  // Check if source folder exists (exact match or parent of subfolders/notes)
  const sourceExists =
    folderNames.has(normOld) ||
    Array.from(folderNames).some((f) => f.startsWith(normOld + '/')) ||
    allNotes.some((n) => n.folder === normOld || n.folder?.startsWith(normOld + '/'));

  if (!sourceExists) {
    return false;
  }

  // Prevent renaming to an existing distinct folder
  if (normOld !== normNew && folderNames.has(normNew)) {
    return false;
  }

  // Prevent cycle: cannot rename a folder into its own descendant path
  if (normNew.startsWith(normOld + '/')) {
    return false;
  }

  // Find all folders to rename
  const foldersToRename: string[] = [];
  for (const f of folderNames) {
    if (f === normOld || f.startsWith(normOld + '/')) {
      foldersToRename.push(f);
    }
  }

  const now = new Date().toISOString();

  await db.transaction('rw', [db.folders, db.notes, db.mutationQueue], async () => {
    for (const f of foldersToRename) {
      await db.folders.delete(f);
      await db.mutationQueue.add({
        id: generateId(),
        entityType: 'folder',
        entityId: f,
        action: 'delete',
        data: { name: f, deletedAt: now, syncStatus: 'pending' },
        createdAt: now,
      });

      let renamed = normNew;
      if (f.startsWith(normOld + '/')) {
        renamed = normNew + f.slice(normOld.length);
      }
      // Auto-register intermediate paths for renamed folder
      const segments = renamed.split('/');
      let cur = '';
      for (const seg of segments) {
        cur = cur ? `${cur}/${seg}` : seg;
        const folderRec: FolderRecord = { name: cur, deletedAt: null, syncStatus: 'pending' };
        await db.folders.put(folderRec);
        await db.mutationQueue.add({
          id: generateId(),
          entityType: 'folder',
          entityId: cur,
          action: 'upsert',
          data: folderRec,
          createdAt: now,
        });
      }
    }

    // Ensure new parent paths for normNew exist in folders table
    const newSegments = normNew.split('/');
    let cur = '';
    for (const seg of newSegments) {
      cur = cur ? `${cur}/${seg}` : seg;
      const folderRec: FolderRecord = { name: cur, deletedAt: null, syncStatus: 'pending' };
      await db.folders.put(folderRec);
      await db.mutationQueue.add({
        id: generateId(),
        entityType: 'folder',
        entityId: cur,
        action: 'upsert',
        data: folderRec,
        createdAt: now,
      });
    }

    // Cascade to all active notes
    for (const note of allNotes) {
      let newFolder: string | undefined = undefined;
      if (note.folder === normOld) {
        newFolder = normNew;
      } else if (note.folder && note.folder.startsWith(normOld + '/')) {
        newFolder = normNew + note.folder.slice(normOld.length);
      }

      if (newFolder !== undefined) {
        const baseUpdatedAt = note.updatedAt;
        const updatedNote: Note = {
          ...note,
          folder: newFolder,
          updatedAt: now,
          syncStatus: 'pending',
        };
        await db.notes.put(updatedNote);
        await db.mutationQueue.add({
          id: generateId(),
          entityType: 'note',
          entityId: updatedNote.id,
          action: 'upsert',
          data: updatedNote,
          baseUpdatedAt,
          createdAt: now,
        });
      }
    }
  });

  return true;
}

export async function deleteFolder(path: string, deleteNotes = false): Promise<boolean> {
  const normPath = normalizeFolderPath(path);
  if (!normPath) {
    return false;
  }

  const folderRecords = (await db.folders.toArray()).filter((f) => !f.deletedAt);
  const folderNames = new Set<string>(folderRecords.map((f) => f.name));
  const allNotes = (await db.notes.toArray()).filter((n) => !n.deletedAt);

  const folderExists =
    folderNames.has(normPath) ||
    Array.from(folderNames).some((f) => f.startsWith(normPath + '/')) ||
    allNotes.some((n) => n.folder === normPath || n.folder?.startsWith(normPath + '/'));

  if (!folderExists) {
    return false;
  }

  // Remove path and all subfolders from folders table
  const toDelete: string[] = [];
  for (const f of folderNames) {
    if (f === normPath || f.startsWith(normPath + '/')) {
      toDelete.push(f);
    }
  }
  if (!toDelete.includes(normPath)) {
    toDelete.push(normPath);
  }

  const now = new Date().toISOString();

  await db.transaction('rw', [db.folders, db.notes, db.mutationQueue], async () => {
    for (const f of toDelete) {
      await db.folders.delete(f);
      await db.mutationQueue.add({
        id: generateId(),
        entityType: 'folder',
        entityId: f,
        action: 'delete',
        data: { name: f, deletedAt: now, syncStatus: 'pending' },
        createdAt: now,
      });
    }

    if (deleteNotes) {
      for (const note of allNotes) {
        if (note.folder === normPath || (note.folder && note.folder.startsWith(normPath + '/'))) {
          const baseUpdatedAt = note.updatedAt;
          const tombstone: Note = {
            ...note,
            deletedAt: now,
            updatedAt: now,
            syncStatus: 'pending',
          };
          await db.notes.put(tombstone);
          await db.mutationQueue.add({
            id: generateId(),
            entityType: 'note',
            entityId: tombstone.id,
            action: 'delete',
            data: tombstone,
            baseUpdatedAt,
            createdAt: now,
          });
        }
      }
    } else {
      for (const note of allNotes) {
        if (note.folder === normPath || (note.folder && note.folder.startsWith(normPath + '/'))) {
          const baseUpdatedAt = note.updatedAt;
          const unlinkedNote: Note = {
            ...note,
            updatedAt: now,
            syncStatus: 'pending',
          };
          delete unlinkedNote.folder;
          await db.notes.put(unlinkedNote);
          await db.mutationQueue.add({
            id: generateId(),
            entityType: 'note',
            entityId: unlinkedNote.id,
            action: 'upsert',
            data: unlinkedNote,
            baseUpdatedAt,
            createdAt: now,
          });
        }
      }
    }
  });

  return true;
}

export async function moveFolder(sourcePath: string, targetParentPath?: string): Promise<boolean> {
  const normSource = normalizeFolderPath(sourcePath);
  if (!normSource) {
    return false;
  }

  const normTarget = targetParentPath ? normalizeFolderPath(targetParentPath) : '';

  // Prevent cycle / self-drop: targetParentPath cannot be sourcePath or start with sourcePath + '/'
  if (normTarget && (normTarget === normSource || normTarget.startsWith(normSource + '/'))) {
    return false;
  }

  const baseName = normSource.split('/').pop()!;
  const newPath = normTarget ? `${normTarget}/${baseName}` : baseName;

  if (newPath === normSource) {
    return false;
  }

  return renameFolder(normSource, newPath);
}

export async function createNote(dto: CreateNoteDTO): Promise<Note> {
  const now = new Date().toISOString();
  const folder = dto.folder ? normalizeFolderPath(dto.folder) || undefined : undefined;

  const newNote: Note = {
    id: generateId(),
    title: dto.title?.trim() || 'Untitled Note',
    content: dto.content ?? '',
    tags: Array.isArray(dto.tags) ? [...dto.tags] : [],
    ...(folder ? { folder } : {}),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.notes, db.folders, db.mutationQueue], async () => {
    if (folder) {
      const segs = folder.split('/');
      let cur = '';
      for (const s of segs) {
        cur = cur ? `${cur}/${s}` : s;
        const folderRec: FolderRecord = { name: cur, deletedAt: null, syncStatus: 'pending' };
        await db.folders.put(folderRec);
        await db.mutationQueue.add({
          id: generateId(),
          entityType: 'folder',
          entityId: cur,
          action: 'upsert',
          data: folderRec,
          baseUpdatedAt: null,
          createdAt: now,
        });
      }
    }
    await db.notes.add(newNote);
    await db.mutationQueue.add({
      id: generateId(),
      entityType: 'note',
      entityId: newNote.id,
      action: 'upsert',
      data: newNote,
      baseUpdatedAt: null,
      createdAt: now,
      });
  });

  return { ...newNote };
}

export async function updateNote(id: string, dto: UpdateNoteDTO): Promise<Note | null> {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt) {
    return null;
  }

  const now = new Date().toISOString();
  const baseUpdatedAt = existing.updatedAt;

  let folder = existing.folder;
  if (dto.folder !== undefined) {
    folder = normalizeFolderPath(dto.folder) || undefined;
  }

  const updated: Note = {
    id: existing.id,
    title: dto.title !== undefined ? dto.title.trim() || 'Untitled Note' : existing.title,
    content: dto.content !== undefined ? dto.content : existing.content,
    tags: dto.tags !== undefined ? (Array.isArray(dto.tags) ? [...dto.tags] : []) : existing.tags,
    createdAt: existing.createdAt,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  };

  if (folder) {
    updated.folder = folder;
  }

  await db.transaction('rw', [db.notes, db.folders, db.mutationQueue], async () => {
    if (folder) {
      const segs = folder.split('/');
      let cur = '';
      for (const s of segs) {
        cur = cur ? `${cur}/${s}` : s;
        const folderRec: FolderRecord = { name: cur, deletedAt: null, syncStatus: 'pending' };
        await db.folders.put(folderRec);
        await db.mutationQueue.add({
          id: generateId(),
          entityType: 'folder',
          entityId: cur,
          action: 'upsert',
          data: folderRec,
          baseUpdatedAt: null,
          createdAt: now,
        });
      }
    }
    await db.notes.put(updated);
    await db.mutationQueue.add({
      id: generateId(),
      entityType: 'note',
      entityId: updated.id,
      action: 'upsert',
      data: updated,
      baseUpdatedAt,
      createdAt: now,
    });
  });

  return { ...updated };
}

export async function deleteNote(id: string): Promise<boolean> {
  const existing = await db.notes.get(id);
  if (!existing || existing.deletedAt) {
    return false;
  }

  const now = new Date().toISOString();
  const tombstone: Note = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.notes, db.mutationQueue], async () => {
    await db.notes.put(tombstone);
    await db.mutationQueue.add({
      id: generateId(),
      entityType: 'note',
      entityId: tombstone.id,
      action: 'delete',
      data: tombstone,
      baseUpdatedAt: existing.updatedAt,
      createdAt: now,
    });
  });

  return true;
}

export async function restoreNote(id: string): Promise<Note | null> {
  const existing = await db.notes.get(id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const restoredNote: Note = {
    ...existing,
    deletedAt: null,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.notes, db.mutationQueue], async () => {
    await db.notes.put(restoredNote);
    await db.mutationQueue.add({
      id: generateId(),
      entityType: 'note',
      entityId: restoredNote.id,
      action: 'upsert',
      data: restoredNote,
      baseUpdatedAt: existing.updatedAt,
      createdAt: now,
    });
  });

  return { ...restoredNote };
}

export async function resetDb(): Promise<void> {
  await db.clearAllUserData();
}
