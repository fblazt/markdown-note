import { ref, computed, watch } from 'vue';
import type { Note, CreateNoteDTO, UpdateNoteDTO, FolderInfo, FolderTreeNode, SaveStatus } from '../../shared/types/note';

// Singleton refs to preserve state across component re-renders
const notes = ref<Note[]>([]);
const folders = ref<FolderInfo[]>([]);
const expandedFolders = ref<string[]>(['Guides', 'Projects', 'Code']);
const selectedFolder = ref<string | null>(null);
const selectedNoteId = ref<string | null>(null);
const searchQuery = ref('');
const selectedTag = ref<string | null>(null);
const saveStatus = ref<SaveStatus>('idle');
const isLoading = ref(false);
const isSaving = ref(false);
const viewMode = ref<'split' | 'editor' | 'preview'>('split');
const isSidebarOpen = ref(true);

const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

// Global resize listener for mobile breakpoint if in browser
if (typeof window !== 'undefined') {
  const updateMobile = () => {
    isMobile.value = window.innerWidth < 768;
  };
  window.addEventListener('resize', updateMobile);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSaveDTO: UpdateNoteDTO | null = null;

function buildFolderTree(folderList: FolderInfo[], notesList: Note[]): FolderTreeNode[] {
  const allPaths = new Set<string>();
  for (const f of folderList) {
    if (!f.name) continue;
    const segs = f.name.split('/').filter(Boolean);
    let cur = '';
    for (const seg of segs) {
      cur = cur ? `${cur}/${seg}` : seg;
      allPaths.add(cur);
    }
  }

  const nodeMap = new Map<string, FolderTreeNode>();
  const sortedPaths = Array.from(allPaths).sort((a, b) => a.localeCompare(b));

  for (const path of sortedPaths) {
    const segs = path.split('/');
    const name = segs[segs.length - 1]!;
    const depth = segs.length - 1;
    const noteCount = notesList.filter((n) => n.folder === path).length;

    nodeMap.set(path, {
      name,
      path,
      depth,
      noteCount,
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const path of sortedPaths) {
    const node = nodeMap.get(path)!;
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      roots.push(node);
    } else {
      const parentPath = path.substring(0, lastSlash);
      const parentNode = nodeMap.get(parentPath);
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export function useNotes() {
  const activeNote = computed<Note | null>(() => {
    if (!selectedNoteId.value) return null;
    return notes.value.find((n) => n.id === selectedNoteId.value) || null;
  });

  const effectiveViewMode = computed<'split' | 'editor' | 'preview'>(() => {
    if (isMobile.value && viewMode.value === 'split') {
      return 'editor';
    }
    return viewMode.value;
  });

  const allTags = computed<string[]>(() => {
    const tagsSet = new Set<string>();
    for (const note of notes.value) {
      if (Array.isArray(note.tags)) {
        for (const tag of note.tags) {
          if (tag.trim()) tagsSet.add(tag.trim());
        }
      }
    }
    return Array.from(tagsSet).sort();
  });

  const folderList = computed<FolderInfo[]>(() => {
    return [...folders.value].sort((a, b) => a.name.localeCompare(b.name));
  });

  const folderTree = computed<FolderTreeNode[]>(() => {
    return buildFolderTree(folders.value, notes.value);
  });

  const searchAndTagFilteredNotes = computed<Note[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const tagFilter = selectedTag.value;

    return notes.value.filter((note) => {
      // Tag filter
      if (tagFilter && (!note.tags || !note.tags.includes(tagFilter))) {
        return false;
      }

      // Search query filter (matches title, content, tags, or folder)
      if (!query) return true;

      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(query));
      const folderMatch = note.folder?.toLowerCase().includes(query);

      return titleMatch || contentMatch || tagMatch || folderMatch;
    });
  });

  const notesByFolder = computed<Record<string, Note[]>>(() => {
    const map: Record<string, Note[]> = {};
    for (const folder of folders.value) {
      map[folder.name] = [];
    }
    for (const note of searchAndTagFilteredNotes.value) {
      if (note.folder) {
        const targetList = map[note.folder] || (map[note.folder] = []);
        targetList.push(note);
      }
    }
    return map;
  });

  const rootNotes = computed<Note[]>(() => {
    return searchAndTagFilteredNotes.value.filter((note) => !note.folder);
  });

  const filteredNotes = computed<Note[]>(() => {
    const base = searchAndTagFilteredNotes.value;
    if (!selectedFolder.value) {
      return base;
    }
    if (selectedFolder.value === '__root__') {
      return base.filter((note) => !note.folder);
    }
    return base.filter((note) => note.folder === selectedFolder.value);
  });

  // Auto-expand parent and child folders when searching/filtering
  watch([searchQuery, selectedTag], ([q, tag]) => {
    if (q || tag) {
      for (const note of searchAndTagFilteredNotes.value) {
        if (note.folder) {
          const segs = note.folder.split('/');
          let cur = '';
          for (const seg of segs) {
            cur = cur ? `${cur}/${seg}` : seg;
            if (!expandedFolders.value.includes(cur)) {
              expandedFolders.value.push(cur);
            }
          }
        }
      }
      if (q) {
        for (const folder of folders.value) {
          if (folder.name.toLowerCase().includes(q.toLowerCase())) {
            const segs = folder.name.split('/');
            let cur = '';
            for (const seg of segs) {
              cur = cur ? `${cur}/${seg}` : seg;
              if (!expandedFolders.value.includes(cur)) {
                expandedFolders.value.push(cur);
              }
            }
          }
        }
      }
    }
  });

  function checkMobile(): boolean {
    if (typeof window !== 'undefined') {
      isMobile.value = window.innerWidth < 768;
    }
    return isMobile.value;
  }

  async function fetchFolders(): Promise<void> {
    try {
      const data = await $fetch<FolderInfo[]>('/api/folders');
      folders.value = data;
      const validNames = new Set(data.map((f) => f.name));
      expandedFolders.value = expandedFolders.value.filter(
        (name) => validNames.has(name) || name === '__uncategorized__'
      );
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  }

  function toggleFolder(folderName: string): void {
    const index = expandedFolders.value.indexOf(folderName);
    if (index === -1) {
      expandedFolders.value.push(folderName);
    } else {
      expandedFolders.value.splice(index, 1);
    }
  }

  function expandAllFolders(): void {
    expandedFolders.value = folders.value.map((f) => f.name);
  }

  function collapseAllFolders(): void {
    expandedFolders.value = [];
  }

  async function createFolder(name: string): Promise<boolean> {
    const trimmed = name?.trim();
    if (!trimmed) return false;
    try {
      await $fetch<{ success: boolean; name: string }>('/api/folders', {
        method: 'POST',
        body: { name: trimmed },
      });
      await fetchFolders();

      // Auto-expand created folder and its ancestor folders
      const segs = trimmed.split('/');
      let cur = '';
      for (const seg of segs) {
        cur = cur ? `${cur}/${seg}` : seg;
        if (!expandedFolders.value.includes(cur)) {
          expandedFolders.value.push(cur);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to create folder:', err);
      return false;
    }
  }

  async function createSubfolder(parentPath: string, subfolderName: string): Promise<boolean> {
    const trimmedSub = subfolderName?.trim();
    if (!trimmedSub) return false;
    const parent = parentPath?.trim();
    const fullPath = parent ? `${parent}/${trimmedSub}` : trimmedSub;
    return await createFolder(fullPath);
  }

  async function renameFolder(oldName: string, newName: string): Promise<boolean> {
    const trimmedNew = newName?.trim();
    if (!trimmedNew || trimmedNew === oldName) return false;
    try {
      await $fetch<{ success: boolean; oldName: string; newName: string }>(
        `/api/folders/${encodeURIComponent(oldName)}`,
        {
          method: 'PUT',
          body: { newName: trimmedNew },
        }
      );

      notes.value.forEach((n) => {
        if (n.folder === oldName) {
          n.folder = trimmedNew;
        } else if (n.folder && n.folder.startsWith(oldName + '/')) {
          n.folder = trimmedNew + n.folder.slice(oldName.length);
        }
      });

      const updatedExpanded: string[] = [];
      for (const exp of expandedFolders.value) {
        if (exp === oldName) {
          updatedExpanded.push(trimmedNew);
        } else if (exp.startsWith(oldName + '/')) {
          updatedExpanded.push(trimmedNew + exp.slice(oldName.length));
        } else {
          updatedExpanded.push(exp);
        }
      }
      expandedFolders.value = updatedExpanded;

      if (selectedFolder.value === oldName) {
        selectedFolder.value = trimmedNew;
      } else if (selectedFolder.value && selectedFolder.value.startsWith(oldName + '/')) {
        selectedFolder.value = trimmedNew + selectedFolder.value.slice(oldName.length);
      }

      await fetchFolders();
      return true;
    } catch (err) {
      console.error(`Failed to rename folder "${oldName}" to "${newName}":`, err);
      return false;
    }
  }

  async function moveFolder(sourcePath: string, targetParentPath?: string): Promise<boolean> {
    const trimmedSource = sourcePath?.trim();
    if (!trimmedSource) return false;
    const trimmedTarget = targetParentPath?.trim() || '';

    if (trimmedTarget && (trimmedTarget === trimmedSource || trimmedTarget.startsWith(trimmedSource + '/'))) {
      return false;
    }

    try {
      const res = await $fetch<{ success: boolean; oldName: string; newName: string }>(
        `/api/folders/${encodeURIComponent(trimmedSource)}`,
        {
          method: 'PUT',
          body: { targetParent: trimmedTarget },
        }
      );

      const newPath = res.newName;

      notes.value.forEach((n) => {
        if (n.folder === trimmedSource) {
          n.folder = newPath;
        } else if (n.folder && n.folder.startsWith(trimmedSource + '/')) {
          n.folder = newPath + n.folder.slice(trimmedSource.length);
        }
      });

      const updatedExpanded: string[] = [];
      for (const exp of expandedFolders.value) {
        if (exp === trimmedSource) {
          updatedExpanded.push(newPath);
        } else if (exp.startsWith(trimmedSource + '/')) {
          updatedExpanded.push(newPath + exp.slice(trimmedSource.length));
        } else {
          updatedExpanded.push(exp);
        }
      }
      if (newPath && !updatedExpanded.includes(newPath)) {
        updatedExpanded.push(newPath);
      }
      if (trimmedTarget && !updatedExpanded.includes(trimmedTarget)) {
        updatedExpanded.push(trimmedTarget);
      }
      expandedFolders.value = updatedExpanded;

      if (selectedFolder.value === trimmedSource) {
        selectedFolder.value = newPath;
      } else if (selectedFolder.value && selectedFolder.value.startsWith(trimmedSource + '/')) {
        selectedFolder.value = newPath + selectedFolder.value.slice(trimmedSource.length);
      }

      await fetchFolders();
      return true;
    } catch (err) {
      console.error(`Failed to move folder "${sourcePath}" to "${targetParentPath}":`, err);
      return false;
    }
  }

  async function deleteFolder(name: string, deleteNotes = false): Promise<boolean> {
    try {
      await $fetch<{ success: boolean; name: string }>(
        `/api/folders/${encodeURIComponent(name)}`,
        {
          method: 'DELETE',
          query: { deleteNotes },
        }
      );

      if (deleteNotes) {
        notes.value = notes.value.filter(
          (n) => !(n.folder === name || (n.folder && n.folder.startsWith(name + '/')))
        );
        if (activeNote.value && (activeNote.value.folder === name || activeNote.value.folder?.startsWith(name + '/'))) {
          selectedNoteId.value = notes.value[0]?.id || null;
        }
      } else {
        notes.value.forEach((n) => {
          if (n.folder === name || (n.folder && n.folder.startsWith(name + '/'))) {
            delete n.folder;
          }
        });
      }

      expandedFolders.value = expandedFolders.value.filter(
        (f) => !(f === name || f.startsWith(name + '/'))
      );
      if (selectedFolder.value === name || (selectedFolder.value && selectedFolder.value.startsWith(name + '/'))) {
        selectedFolder.value = null;
      }
      await fetchFolders();
      return true;
    } catch (err) {
      console.error(`Failed to delete folder "${name}":`, err);
      return false;
    }
  }

  async function moveNoteToFolder(noteId: string, folderName?: string): Promise<void> {
    const targetFolder = folderName?.trim() || '';
    await updateNote(noteId, { folder: targetFolder });
    if (targetFolder) {
      const segs = targetFolder.split('/');
      let cur = '';
      for (const seg of segs) {
        cur = cur ? `${cur}/${seg}` : seg;
        if (!expandedFolders.value.includes(cur)) {
          expandedFolders.value.push(cur);
        }
      }
    }
    await fetchFolders();
  }

  async function fetchNotes(): Promise<void> {
    isLoading.value = true;
    try {
      const [data] = await Promise.all([
        $fetch<Note[]>('/api/notes'),
        fetchFolders(),
      ]);
      notes.value = data;
      if (!selectedNoteId.value && data.length > 0 && data[0]) {
        selectedNoteId.value = data[0].id;
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      isLoading.value = false;
    }
  }

  function selectNote(id: string | null): void {
    // Flush any pending auto-save before switching note
    flushAutoSave();
    selectedNoteId.value = id;
    saveStatus.value = 'idle';
  }

  function openNote(id: string): void {
    selectNote(id);
    if (isMobile.value) {
      isSidebarOpen.value = false;
      if (viewMode.value === 'split') {
        viewMode.value = 'editor';
      }
    }
  }

  function navigateBackToList(): void {
    isSidebarOpen.value = true;
  }

  async function createNote(dto?: Partial<CreateNoteDTO>): Promise<Note | null> {
    flushAutoSave();
    isLoading.value = true;
    try {
      let folderVal = dto?.folder;
      if (folderVal === undefined && selectedFolder.value && selectedFolder.value !== '__root__') {
        folderVal = selectedFolder.value;
      }

      const payload: CreateNoteDTO = {
        title: dto?.title?.trim() || 'Untitled Note',
        content: dto?.content ?? '',
        tags: dto?.tags ?? [],
        folder: folderVal ? folderVal.trim() : undefined,
      };

      const created = await $fetch<Note>('/api/notes', {
        method: 'POST',
        body: payload,
      });

      notes.value = [created, ...notes.value];
      selectedNoteId.value = created.id;
      saveStatus.value = 'saved';

      if (created.folder && !expandedFolders.value.includes(created.folder)) {
        expandedFolders.value.push(created.folder);
      }
      await fetchFolders();

      if (isMobile.value) {
        isSidebarOpen.value = false;
        if (viewMode.value === 'split') {
          viewMode.value = 'editor';
        }
      }

      return created;
    } catch (err) {
      console.error('Failed to create note:', err);
      saveStatus.value = 'error';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateNote(id: string, dto: UpdateNoteDTO): Promise<Note | null> {
    isSaving.value = true;
    saveStatus.value = 'saving';

    try {
      const updated = await $fetch<Note>(`/api/notes/${id}`, {
        method: 'PUT',
        body: dto,
      });

      const index = notes.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        notes.value[index] = updated;
      }
      saveStatus.value = 'saved';

      if (dto.folder !== undefined) {
        if (updated.folder && !expandedFolders.value.includes(updated.folder)) {
          expandedFolders.value.push(updated.folder);
        }
        await fetchFolders();
      }

      return updated;
    } catch (err) {
      console.error(`Failed to update note ${id}:`, err);
      saveStatus.value = 'error';
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteNote(id: string): Promise<boolean> {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      pendingSaveDTO = null;
    }

    try {
      await $fetch<{ success: boolean; id: string }>(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      notes.value = notes.value.filter((n) => n.id !== id);

      if (selectedNoteId.value === id) {
        selectedNoteId.value = notes.value.length > 0 && notes.value[0] ? notes.value[0].id : null;
      }
      await fetchFolders();
      return true;
    } catch (err) {
      console.error(`Failed to delete note ${id}:`, err);
      return false;
    }
  }

  function queueAutoSave(dto: UpdateNoteDTO, debounceMs = 500): void {
    if (!selectedNoteId.value) return;

    // Optimistically update local active note in memory for immediate UI responsiveness
    const currentId = selectedNoteId.value;
    const noteIndex = notes.value.findIndex((n) => n.id === currentId);
    if (noteIndex !== -1 && notes.value[noteIndex]) {
      const existing = notes.value[noteIndex]!;
      const updatedFolder = dto.folder !== undefined ? (dto.folder.trim() || undefined) : existing.folder;
      const updatedNote: Note = {
        id: existing.id,
        title: dto.title !== undefined ? dto.title : existing.title,
        content: dto.content !== undefined ? dto.content : existing.content,
        tags: dto.tags !== undefined ? dto.tags : existing.tags,
        folder: updatedFolder,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      notes.value[noteIndex] = updatedNote;
    }

    saveStatus.value = 'unsaved';
    pendingSaveDTO = { ...pendingSaveDTO, ...dto };

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (pendingSaveDTO && selectedNoteId.value) {
        const toSave = { ...pendingSaveDTO };
        pendingSaveDTO = null;
        await updateNote(currentId, toSave);
      }
      debounceTimer = null;
    }, debounceMs);
  }

  function flushAutoSave(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pendingSaveDTO && selectedNoteId.value) {
      const currentId = selectedNoteId.value;
      const toSave = { ...pendingSaveDTO };
      pendingSaveDTO = null;
      updateNote(currentId, toSave);
    }
  }

  function toggleTagFilter(tag: string): void {
    if (selectedTag.value === tag) {
      selectedTag.value = null;
    } else {
      selectedTag.value = tag;
    }
  }

  function setViewMode(mode: 'split' | 'editor' | 'preview'): void {
    if (isMobile.value && mode === 'split') {
      viewMode.value = 'editor';
    } else {
      viewMode.value = mode;
    }
  }

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value;
  }

  return {
    // State
    notes,
    folders,
    expandedFolders,
    selectedFolder,
    selectedNoteId,
    activeNote,
    searchQuery,
    selectedTag,
    allTags,
    filteredNotes,
    folderList,
    folderTree,
    notesByFolder,
    rootNotes,
    saveStatus,
    isLoading,
    isSaving,
    viewMode,
    effectiveViewMode,
    isSidebarOpen,
    isMobile,

    // Actions
    fetchNotes,
    fetchFolders,
    toggleFolder,
    expandAllFolders,
    collapseAllFolders,
    createFolder,
    createSubfolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    moveNoteToFolder,
    selectNote,
    openNote,
    navigateBackToList,
    createNote,
    updateNote,
    deleteNote,
    queueAutoSave,
    flushAutoSave,
    toggleTagFilter,
    setViewMode,
    toggleSidebar,
    checkMobile,
  };
}
