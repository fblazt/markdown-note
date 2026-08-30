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

export const INITIAL_FOLDERS = ['Guides', 'Projects', 'Code'];

export const SEED_NOTES: Note[] = [
  {
    id: 'seed-welcome-guide',
    title: '✨ Welcome to Markdown Notes',
    content: `# Welcome to Markdown Notes

A blazing fast, distraction-free markdown note-taking app built with **Nuxt 3**, **Vue 3**, and **Nitro**.

---

## 🚀 Key Features

* **Real-time Live Preview**: See your formatted content immediately as you write.
* **Auto-Save**: Changes are automatically debounced and saved.
* **Tagging & Instant Search**: Filter by tags or search full text instantly.
* **GFM Support**: Full GitHub Flavored Markdown support including tables, task lists, and syntax highlighting.
* **Mermaid Flowcharts & Diagrams**: Render interactive flowcharts, state machines, and sequence diagrams directly from markdown code blocks.
* **XSS Protection**: Complete sanitization powered by isomorphic DOMPurify.

---

## 📝 Markdown Syntax Cheat Sheet

### Typography & Formatting
You can format text using standard markdown tokens:
* **Bold text** with \`**bold**\` or \`__bold__\`
* *Italic text* with \`*italic*\` or \`_italic_\`
* ~~Strikethrough~~ with \`~~strikethrough~~\`
* \`Inline code\` with backticks
* Highlighted blockquotes:

> "Simplicity is prerequisite for reliability."
> — *Edsger W. Dijkstra*

---

### Task List
- [x] Set up Nuxt 4 directory structure
- [x] Implement Nitro REST API endpoints
- [x] Configure live markdown parser & sanitizer
- [ ] Add your first custom note!

---

### Tables
| Feature | Status | Technology |
| :--- | :---: | :--- |
| Live Preview | ✅ | Marked.js + DOMPurify |
| Reactive State | ✅ | Vue 3 Composition API |
| Auto-save | ✅ | Debounced REST API |
| Security | ✅ | Strict XSS Sanitization |

---

### Code Blocks
\`\`\`typescript
// Composable auto-save example
import { useDebounceFn } from '@vueuse/core';

export const useNoteAutoSave = (saveFn: () => Promise<void>) => {
  const isSaving = ref(false);
  const debouncedSave = useDebounceFn(async () => {
    isSaving.value = true;
    await saveFn();
    isSaving.value = false;
  }, 500);

  return { debouncedSave, isSaving };
};
\`\`\`

---

### Mermaid Flowcharts & Diagrams
Create responsive diagrams directly inside your notes:

\`\`\`mermaid
flowchart LR
    A[📝 Write Markdown] --> B{Mermaid Block?}
    B -->|Yes| C[⚡ Live SVG Render]
    B -->|No| D[📄 Standard Preview]
    C --> E[🎨 Kanagawa Theme]
    D --> E
\`\`\`
`,
    tags: ['guide', 'markdown', 'welcome', 'mermaid', 'diagram'],
    folder: 'Guides',
    createdAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2025-01-01T08:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
  },
  {
    id: 'seed-project-roadmap',
    title: '🗺️ Project Architecture & Roadmap',
    content: `# Markdown Note App Architecture

## Layer Overview

1. **Presentation Layer (\`app/\`)**
   - \`NoteSidebar.vue\`: Note list, tag filter chips, instant search, delete action.
   - \`NoteEditor.vue\`: Reactive textarea, formatting toolbar, auto-save status.
   - \`NotePreview.vue\`: Sanitized HTML renderer, statistics bar (words, reading time).

2. **State Management (\`app/composables/\`)**
   - \`useNotes.ts\`: Central state, active note selection, CRUD handlers, debounce auto-save.

3. **Backend & Storage (\`server/\`)**
   - Nitro REST API endpoints in \`server/api/notes/\`.
   - In-memory data store with reset capability in \`server/utils/db.ts\`.

## 🏗️ System Architecture Flow

\`\`\`mermaid
flowchart TD
    User([👤 User]) <--> NoteEditor[📝 NoteEditor & Toolbar]
    User <--> NotePreview[👁️ NotePreview & Mermaid]
    NoteEditor -->|Auto-save| useNotes[⚡ useNotes Composable]
    useNotes -->|IndexedDB Operations| DexieDB[(💾 Dexie NotesDatabase)]
    useTheme[🎨 useTheme] -.->|Synchronize Theme| NotePreview
\`\`\`

## 📌 Next Milestones
- [x] Core MVP Architecture
- [x] Automated Vitest Unit & API Suite
- [ ] Offline local storage sync
- [ ] Export to PDF & Markdown file
`,
    tags: ['architecture', 'roadmap', 'nuxt', 'diagram'],
    folder: 'Projects',
    createdAt: '2025-01-02T10:30:00.000Z',
    updatedAt: '2025-01-02T11:00:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
  },
  {
    id: 'seed-code-snippets',
    title: '⚡ Useful Code Snippets',
    content: `# Useful TypeScript & Nuxt Snippets

### 1. Custom Debounce Composable
\`\`\`typescript
import { ref } from 'vue';

export function useDebounce<T>(value: Ref<T>, delay = 300) {
  const debouncedValue = ref(value.value) as Ref<T>;
  let timeout: NodeJS.Timeout;

  watch(value, (newVal) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      debouncedValue.value = newVal;
    }, delay);
  });

  return debouncedValue;
}
\`\`\`

### 2. Nitro Event Handler
\`\`\`typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    });
  }
  return createNote(body);
});
\`\`\`
`,
    tags: ['typescript', 'snippets', 'code'],
    folder: 'Code',
    createdAt: '2025-01-03T14:15:00.000Z',
    updatedAt: '2025-01-03T14:15:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
  },
];

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

let seedingPromise: Promise<void> | null = null;

export async function seedInitialData(): Promise<void> {
  const notesCount = await db.notes.count();
  const foldersCount = await db.folders.count();
  if (notesCount === 0 && foldersCount === 0) {
    await db.transaction('rw', [db.notes, db.folders], async () => {
      const nc = await db.notes.count();
      const fc = await db.folders.count();
      if (nc === 0 && fc === 0) {
        await db.folders.bulkAdd(INITIAL_FOLDERS.map((name) => ({ name, deletedAt: null, syncStatus: 'synced' })));
        await db.notes.bulkAdd(SEED_NOTES);
      }
    });
  }
}

async function ensureSeeded(): Promise<void> {
  if (seedingPromise) {
    return seedingPromise;
  }
  seedingPromise = seedInitialData().finally(() => {
    seedingPromise = null;
  });
  return seedingPromise;
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
  await ensureSeeded();
  const notes = await db.notes.toArray();
  return notes
    .filter((n) => !n.deletedAt)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getNoteById(id: string): Promise<Note | null> {
  await ensureSeeded();
  const note = await db.notes.get(id);
  if (!note || note.deletedAt) {
    return null;
  }
  return { ...note };
}

export async function getAllFolders(): Promise<FolderInfo[]> {
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await ensureSeeded();
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
  await db.transaction('rw', [db.notes, db.folders, db.mutationQueue, db.syncMeta], async () => {
    await db.notes.clear();
    await db.folders.clear();
    await db.mutationQueue.clear();
    await db.syncMeta.clear();
    await db.folders.bulkAdd(INITIAL_FOLDERS.map((name) => ({ name, deletedAt: null, syncStatus: 'synced' })));
    await db.notes.bulkAdd(SEED_NOTES);
  });
}
