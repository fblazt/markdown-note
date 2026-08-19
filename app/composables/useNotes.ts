import { ref, computed } from 'vue';
import type { Note, CreateNoteDTO, UpdateNoteDTO, SaveStatus } from '../../shared/types/note';

// Singleton refs to preserve state across component re-renders
const notes = ref<Note[]>([]);
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

  const filteredNotes = computed<Note[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const tagFilter = selectedTag.value;

    return notes.value.filter((note) => {
      // Tag filter
      if (tagFilter && (!note.tags || !note.tags.includes(tagFilter))) {
        return false;
      }

      // Search query filter (matches title, content, or tags)
      if (!query) return true;

      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = note.content.toLowerCase().includes(query);
      const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(query));

      return titleMatch || contentMatch || tagMatch;
    });
  });

  function checkMobile(): boolean {
    if (typeof window !== 'undefined') {
      isMobile.value = window.innerWidth < 768;
    }
    return isMobile.value;
  }

  async function fetchNotes(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await $fetch<Note[]>('/api/notes');
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
      const payload: CreateNoteDTO = {
        title: dto?.title?.trim() || 'Untitled Note',
        content: dto?.content ?? '',
        tags: dto?.tags ?? [],
      };

      const created = await $fetch<Note>('/api/notes', {
        method: 'POST',
        body: payload,
      });

      notes.value = [created, ...notes.value];
      selectedNoteId.value = created.id;
      saveStatus.value = 'saved';

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
      await $fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      notes.value = notes.value.filter((n) => n.id !== id);

      if (selectedNoteId.value === id) {
        selectedNoteId.value = notes.value.length > 0 && notes.value[0] ? notes.value[0].id : null;
      }
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
      const updatedNote: Note = {
        id: existing.id,
        title: dto.title !== undefined ? dto.title : existing.title,
        content: dto.content !== undefined ? dto.content : existing.content,
        tags: dto.tags !== undefined ? dto.tags : existing.tags,
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
    selectedNoteId,
    activeNote,
    searchQuery,
    selectedTag,
    allTags,
    filteredNotes,
    saveStatus,
    isLoading,
    isSaving,
    viewMode,
    effectiveViewMode,
    isSidebarOpen,
    isMobile,

    // Actions
    fetchNotes,
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
