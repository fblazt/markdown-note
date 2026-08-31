import { ref, computed } from 'vue';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '../../shared/types/note';
import { useStorageQuota } from './useStorageQuota';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { useSync } from './useSync';
import { exportNoteJson, downloadBlob } from '../utils/export';
import {
  getAllNotes,
  createNote as dbCreateNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  restoreNote as dbRestoreNote,
} from '../utils/db';
import { useFolders } from './useFolders';
import { useAutoSave, isQuotaExceededError, handleQuotaExceeded } from './useAutoSave';
import { useNoteFilter } from './useNoteFilter';
import { useWorkspaceLayout } from './useWorkspaceLayout';

const getInitialSelectedNoteId = (): string | null => {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem('markdown-note-active-note-id');
    } catch {}
  }
  return null;
};

// Singleton refs for core note state
const notes = ref<Note[]>([]);
const selectedNoteId = ref<string | null>(getInitialSelectedNoteId());
const isLoading = ref(false);

export function useNotes() {
  // 1. Initialize Sub-composables with shared state
  const folderComposable = useFolders(notes, selectedNoteId);
  const {
    folders,
    expandedFolders,
    selectedFolder,
    folderList,
    folderTree,
    fetchFolders,
    toggleFolder,
    expandAllFolders,
    collapseAllFolders,
    createFolder,
    createSubfolder,
    renameFolder,
    moveFolder,
    deleteFolder,
  } = folderComposable;

  const autoSaveComposable = useAutoSave({
    notes,
    selectedNoteId,
    onUpdateNote: updateNote,
  });
  const {
    saveStatus,
    isSaving,
    queueAutoSave,
    flushAutoSave,
  } = autoSaveComposable;

  const filterComposable = useNoteFilter({
    notes,
    folders,
    expandedFolders,
    selectedFolder,
  });
  const {
    searchQuery,
    selectedTag,
    allTags,
    filteredNotes,
    notesByFolder,
    rootNotes,
    toggleTagFilter,
  } = filterComposable;

  const layoutComposable = useWorkspaceLayout();
  const {
    viewMode,
    effectiveViewMode,
    isSidebarOpen,
    isMobile,
    setViewMode,
    toggleSidebar,
    navigateBackToList,
    checkMobile,
  } = layoutComposable;

  const activeNote = computed<Note | null>(() => {
    if (!selectedNoteId.value) return null;
    return notes.value.find((n) => n.id === selectedNoteId.value) || null;
  });

  async function updateNote(id: string, dto: UpdateNoteDTO): Promise<Note | null> {
    isSaving.value = true;
    saveStatus.value = 'saving';

    try {
      const updated = await dbUpdateNote(id, dto);
      if (!updated) {
        saveStatus.value = 'error';
        return null;
      }

      const index = notes.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        notes.value[index] = updated;
      }
      saveStatus.value = 'saved';

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`markdown-note-draft-${id}`);
        } catch {}
      }

      if (dto.folder !== undefined) {
        if (updated.folder && !expandedFolders.value.includes(updated.folder)) {
          expandedFolders.value.push(updated.folder);
        }
        await fetchFolders();
      }

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return updated;
    } catch (err) {
      console.error(`Failed to update note ${id}:`, err);
      saveStatus.value = 'error';
      if (isQuotaExceededError(err)) {
        handleQuotaExceeded(notes.value);
      }
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function fetchNotes(): Promise<void> {
    isLoading.value = true;
    try {
      const [data] = await Promise.all([
        getAllNotes(),
        fetchFolders(),
      ]);

      if (typeof localStorage !== 'undefined') {
        for (const note of data) {
          try {
            const draft = localStorage.getItem(`markdown-note-draft-${note.id}`);
            if (draft !== null) {
              note.content = draft;
            }
          } catch {}
        }
      }

      notes.value = data;

      let storedId: string | null = null;
      if (typeof localStorage !== 'undefined') {
        try {
          storedId = localStorage.getItem('markdown-note-active-note-id');
        } catch {}
      }

      if (storedId && data.some((n) => n.id === storedId)) {
        selectedNoteId.value = storedId;
      } else if (!selectedNoteId.value || !data.some((n) => n.id === selectedNoteId.value)) {
        const fallbackId = data.length > 0 && data[0] ? data[0].id : null;
        selectedNoteId.value = fallbackId;
        if (fallbackId && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('markdown-note-active-note-id', fallbackId);
          } catch {}
        }
      }

      // Background delta synchronization if authenticated
      try {
        const { isAuthenticated, isOfflineAuthed } = useAuth();
        if (isAuthenticated.value && !isOfflineAuthed.value) {
          useSync().sync().catch((syncErr) => {
            console.error('Background sync failed:', syncErr);
          });
        }
      } catch {}
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
    if (typeof localStorage !== 'undefined') {
      try {
        if (id) {
          localStorage.setItem('markdown-note-active-note-id', id);
        } else {
          localStorage.removeItem('markdown-note-active-note-id');
        }
      } catch {}
    }
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

  function selectNextNote(): void {
    if (notes.value.length === 0) {
      selectNote(null);
      return;
    }

    const currentIndex = notes.value.findIndex((n) => n.id === selectedNoteId.value);
    if (currentIndex === -1) {
      selectNote(notes.value[0]?.id || null);
      return;
    }

    if (currentIndex + 1 < notes.value.length) {
      selectNote(notes.value[currentIndex + 1]!.id);
    } else if (currentIndex - 1 >= 0) {
      selectNote(notes.value[currentIndex - 1]!.id);
    } else {
      selectNote(null);
    }
  }

  async function createNote(dto?: Partial<CreateNoteDTO>): Promise<Note | null> {
    flushAutoSave();
    isLoading.value = true;

    // Check storage quota status before creating
    try {
      const { checkQuota } = useStorageQuota();
      const { showToast } = useToast();
      const quota = await checkQuota();
      if (quota.status === 'warning' || quota.status === 'critical') {
        const percent = Math.round(quota.percentage);
        showToast({
          title: quota.status === 'critical' ? 'Storage space critical' : 'Storage limit near',
          message: `Storage is ${percent}% used (${quota.formattedRemaining} remaining).`,
          type: quota.status === 'critical' ? 'danger' : 'warning',
          action: {
            label: 'Export Backup',
            onClick: () => {
              const content = exportNoteJson(notes.value);
              downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
            },
          },
        });
      }
    } catch {}

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

      const created = await dbCreateNote(payload);

      notes.value = [created, ...notes.value];
      selectedNoteId.value = created.id;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('markdown-note-active-note-id', created.id);
        } catch {}
      }
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

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return created;
    } catch (err) {
      console.error('Failed to create note:', err);
      saveStatus.value = 'error';
      if (isQuotaExceededError(err)) {
        handleQuotaExceeded(notes.value);
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteNote(id: string): Promise<boolean> {
    flushAutoSave();

    try {
      const isActive = selectedNoteId.value === id;
      if (isActive) {
        selectNextNote();
      }

      const success = await dbDeleteNote(id);
      if (!success) return false;

      notes.value = notes.value.filter((n) => n.id !== id);

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`markdown-note-draft-${id}`);
        } catch {}
      }

      if (selectedNoteId.value === id) {
        const nextId = notes.value.length > 0 && notes.value[0] ? notes.value[0].id : null;
        selectedNoteId.value = nextId;
        if (typeof localStorage !== 'undefined') {
          try {
            if (nextId) {
              localStorage.setItem('markdown-note-active-note-id', nextId);
            } else {
              localStorage.removeItem('markdown-note-active-note-id');
            }
          } catch {}
        }
      }
      await fetchFolders();
      try {
        const { checkQuota } = useStorageQuota();
        await checkQuota();
      } catch {}

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return true;
    } catch (err) {
      console.error(`Failed to delete note ${id}:`, err);
      return false;
    }
  }

  async function restoreNote(id: string): Promise<Note | null> {
    try {
      const restored = await dbRestoreNote(id);
      if (!restored) return null;

      const index = notes.value.findIndex((n) => n.id === id);
      if (index !== -1) {
        notes.value[index] = restored;
      } else {
        notes.value = [restored, ...notes.value];
      }

      selectedNoteId.value = id;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('markdown-note-active-note-id', id);
        } catch {}
      }

      if (restored.folder && !expandedFolders.value.includes(restored.folder)) {
        expandedFolders.value.push(restored.folder);
      }
      await fetchFolders();

      try {
        useSync().triggerDebouncedSync();
      } catch {}

      return restored;
    } catch (err) {
      console.error(`Failed to restore note ${id}:`, err);
      return null;
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
    selectNextNote,
    openNote,
    navigateBackToList,
    createNote,
    updateNote,
    deleteNote,
    restoreNote,
    queueAutoSave,
    flushAutoSave,
    toggleTagFilter,
    setViewMode,
    toggleSidebar,
    checkMobile,
  };
}

// Global browser listeners
if (typeof window !== 'undefined') {
  const { initAutoSaveListeners } = useAutoSave();
  initAutoSaveListeners();

  window.addEventListener('notes-synced', async () => {
    try {
      const [data, folderData] = await Promise.all([
        getAllNotes(),
        useFolders().fetchFolders(),
      ]);
      notes.value = data;
    } catch {}
  });
}
