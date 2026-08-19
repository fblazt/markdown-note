import type { Note, CreateNoteDTO, UpdateNoteDTO, FolderInfo } from '../../shared/types/note';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

const INITIAL_FOLDERS = ['Guides', 'Projects', 'Code'];

const SEED_NOTES: Note[] = [
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
`,
    tags: ['guide', 'markdown', 'welcome'],
    folder: 'Guides',
    createdAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2025-01-01T08:00:00.000Z',
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

## 📌 Next Milestones
- [x] Core MVP Architecture
- [x] Automated Vitest Unit & API Suite
- [ ] Offline local storage sync
- [ ] Export to PDF & Markdown file
`,
    tags: ['architecture', 'roadmap', 'nuxt'],
    folder: 'Projects',
    createdAt: '2025-01-02T10:30:00.000Z',
    updatedAt: '2025-01-02T11:00:00.000Z',
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
  },
];

let notesDb: Note[] = JSON.parse(JSON.stringify(SEED_NOTES));
let foldersDb: Set<string> = new Set(INITIAL_FOLDERS);

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

export function getAllNotes(): Note[] {
  return [...notesDb].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getNoteById(id: string): Note | null {
  const note = notesDb.find((n) => n.id === id);
  return note ? { ...note } : null;
}

export function getAllFolders(): FolderInfo[] {
  const allFolderNames = new Set<string>(foldersDb);
  for (const note of notesDb) {
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
    noteCount: notesDb.filter((n) => n.folder === name).length,
  }));
}

export function createFolder(path: string): boolean {
  const normalized = normalizeFolderPath(path);
  if (!normalized) {
    return false;
  }
  if (foldersDb.has(normalized)) {
    return false;
  }

  // Auto-register intermediate parent paths
  const segments = normalized.split('/');
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    currentPath = currentPath ? `${currentPath}/${segments[i]}` : segments[i]!;
    foldersDb.add(currentPath);
  }

  return true;
}

export function renameFolder(oldPath: string, newPath: string): boolean {
  const normOld = normalizeFolderPath(oldPath);
  const normNew = normalizeFolderPath(newPath);

  if (!normOld || !normNew) {
    return false;
  }

  // Check if source folder exists (exact match or parent of subfolders/notes)
  const sourceExists =
    foldersDb.has(normOld) ||
    Array.from(foldersDb).some((f) => f.startsWith(normOld + '/')) ||
    notesDb.some((n) => n.folder === normOld || n.folder?.startsWith(normOld + '/'));

  if (!sourceExists) {
    return false;
  }

  // Prevent renaming to an existing distinct folder
  if (normOld !== normNew && foldersDb.has(normNew)) {
    return false;
  }

  // Prevent cycle: cannot rename a folder into its own descendant path
  if (normNew.startsWith(normOld + '/')) {
    return false;
  }

  // Find all folders to rename
  const foldersToRename: string[] = [];
  for (const f of foldersDb) {
    if (f === normOld || f.startsWith(normOld + '/')) {
      foldersToRename.push(f);
    }
  }

  for (const f of foldersToRename) {
    foldersDb.delete(f);
    let renamed = normNew;
    if (f.startsWith(normOld + '/')) {
      renamed = normNew + f.slice(normOld.length);
    }
    // Auto-register intermediate paths for renamed folder
    const segments = renamed.split('/');
    let cur = '';
    for (const seg of segments) {
      cur = cur ? `${cur}/${seg}` : seg;
      foldersDb.add(cur);
    }
  }

  // Ensure new parent paths for normNew exist in foldersDb
  const newSegments = normNew.split('/');
  let cur = '';
  for (const seg of newSegments) {
    cur = cur ? `${cur}/${seg}` : seg;
    foldersDb.add(cur);
  }

  // Cascade to all notes
  const now = new Date().toISOString();
  for (const note of notesDb) {
    if (note.folder === normOld) {
      note.folder = normNew;
      note.updatedAt = now;
    } else if (note.folder && note.folder.startsWith(normOld + '/')) {
      note.folder = normNew + note.folder.slice(normOld.length);
      note.updatedAt = now;
    }
  }

  return true;
}

export function deleteFolder(path: string, deleteNotes = false): boolean {
  const normPath = normalizeFolderPath(path);
  if (!normPath) {
    return false;
  }

  const folderExists =
    foldersDb.has(normPath) ||
    Array.from(foldersDb).some((f) => f.startsWith(normPath + '/')) ||
    notesDb.some((n) => n.folder === normPath || n.folder?.startsWith(normPath + '/'));

  if (!folderExists) {
    return false;
  }

  // Remove path and all subfolders from foldersDb
  const toDelete: string[] = [];
  for (const f of foldersDb) {
    if (f === normPath || f.startsWith(normPath + '/')) {
      toDelete.push(f);
    }
  }
  for (const f of toDelete) {
    foldersDb.delete(f);
  }

  if (deleteNotes) {
    notesDb = notesDb.filter(
      (n) => !(n.folder === normPath || (n.folder && n.folder.startsWith(normPath + '/')))
    );
  } else {
    const now = new Date().toISOString();
    for (const note of notesDb) {
      if (note.folder === normPath || (note.folder && note.folder.startsWith(normPath + '/'))) {
        delete note.folder;
        note.updatedAt = now;
      }
    }
  }

  return true;
}

export function moveFolder(sourcePath: string, targetParentPath?: string): boolean {
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

export function createNote(dto: CreateNoteDTO): Note {
  const now = new Date().toISOString();
  const folder = dto.folder ? normalizeFolderPath(dto.folder) || undefined : undefined;
  if (folder) {
    const segs = folder.split('/');
    let cur = '';
    for (const s of segs) {
      cur = cur ? `${cur}/${s}` : s;
      foldersDb.add(cur);
    }
  }

  const newNote: Note = {
    id: generateId(),
    title: dto.title?.trim() || 'Untitled Note',
    content: dto.content ?? '',
    tags: Array.isArray(dto.tags) ? [...dto.tags] : [],
    ...(folder ? { folder } : {}),
    createdAt: now,
    updatedAt: now,
  };
  notesDb.push(newNote);
  return { ...newNote };
}

export function updateNote(id: string, dto: UpdateNoteDTO): Note | null {
  const index = notesDb.findIndex((n) => n.id === id);
  if (index === -1) {
    return null;
  }

  const existing = notesDb[index]!;
  const now = new Date().toISOString();

  let folder = existing.folder;
  if (dto.folder !== undefined) {
    folder = normalizeFolderPath(dto.folder) || undefined;
    if (folder) {
      const segs = folder.split('/');
      let cur = '';
      for (const s of segs) {
        cur = cur ? `${cur}/${s}` : s;
        foldersDb.add(cur);
      }
    }
  }

  const updated: Note = {
    id: existing.id,
    title: dto.title !== undefined ? dto.title.trim() || 'Untitled Note' : existing.title,
    content: dto.content !== undefined ? dto.content : existing.content,
    tags: dto.tags !== undefined ? (Array.isArray(dto.tags) ? [...dto.tags] : []) : existing.tags,
    ...(folder ? { folder } : {}),
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  notesDb[index] = updated;
  return { ...updated };
}

export function deleteNote(id: string): boolean {
  const index = notesDb.findIndex((n) => n.id === id);
  if (index === -1) {
    return false;
  }
  notesDb.splice(index, 1);
  return true;
}

export function resetDb(): void {
  notesDb = JSON.parse(JSON.stringify(SEED_NOTES));
  foldersDb = new Set(INITIAL_FOLDERS);
}

