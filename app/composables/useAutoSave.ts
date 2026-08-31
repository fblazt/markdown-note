import { ref, type Ref } from 'vue';
import type { Note, UpdateNoteDTO, SaveStatus } from '../../shared/types/note';
import { useStorageQuota } from './useStorageQuota';
import { useToast } from './useToast';
import { exportNoteJson, downloadBlob } from '../utils/export';

export function isQuotaExceededError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const e = err as any;
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return true;
    }
    if (
      typeof e.message === 'string' &&
      (e.message.includes('QuotaExceeded') ||
        e.message.includes('quota') ||
        e.message.includes('exceeded'))
    ) {
      return true;
    }
    if (e.code === 22 || e.number === -2147024882) {
      return true;
    }
  }
  return false;
}

export function handleQuotaExceeded(notesList: Note[] = []): void {
  const { setStorageExceeded } = useStorageQuota();
  const { showToast } = useToast();
  setStorageExceeded();
  showToast({
    title: 'Storage Quota Exceeded',
    message: 'Could not save note because browser storage is full. Please export a backup.',
    type: 'danger',
    duration: 0,
    action: {
      label: 'Export Backup',
      onClick: () => {
        const content = exportNoteJson(notesList);
        downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
      },
    },
  });
}

// Singleton refs for auto-save state
const saveStatus = ref<SaveStatus>('idle');
const isSaving = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSaveDTO: UpdateNoteDTO | null = null;

let boundNotesRef: Ref<Note[]> | null = null;
let boundSelectedNoteIdRef: Ref<string | null> | null = null;
let boundUpdateFn: ((id: string, dto: UpdateNoteDTO) => Promise<Note | null>) | null = null;

export interface UseAutoSaveOptions {
  notes?: Ref<Note[]>;
  selectedNoteId?: Ref<string | null>;
  onUpdateNote?: (id: string, dto: UpdateNoteDTO) => Promise<Note | null>;
}

export function useAutoSave(options?: UseAutoSaveOptions) {
  if (options?.notes) boundNotesRef = options.notes;
  if (options?.selectedNoteId) boundSelectedNoteIdRef = options.selectedNoteId;
  if (options?.onUpdateNote) boundUpdateFn = options.onUpdateNote;

  function queueAutoSave(dto: UpdateNoteDTO, debounceMs = 500): void {
    const currentId = boundSelectedNoteIdRef?.value;
    if (!currentId) return;

    // Optimistically update local active note in memory for immediate UI responsiveness
    if (boundNotesRef?.value) {
      const noteIndex = boundNotesRef.value.findIndex((n) => n.id === currentId);
      if (noteIndex !== -1 && boundNotesRef.value[noteIndex]) {
        const existing = boundNotesRef.value[noteIndex]!;
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
        boundNotesRef.value[noteIndex] = updatedNote;

        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`markdown-note-draft-${currentId}`, updatedNote.content);
          } catch {}
        }
      }
    }

    saveStatus.value = 'unsaved';
    pendingSaveDTO = { ...pendingSaveDTO, ...dto };

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (pendingSaveDTO && boundSelectedNoteIdRef?.value) {
        const toSave = { ...pendingSaveDTO };
        pendingSaveDTO = null;
        if (boundUpdateFn) {
          await boundUpdateFn(currentId, toSave);
        }
      }
      debounceTimer = null;
    }, debounceMs);
  }

  function flushAutoSave(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (pendingSaveDTO && boundSelectedNoteIdRef?.value) {
      const currentId = boundSelectedNoteIdRef.value;
      const toSave = { ...pendingSaveDTO };
      pendingSaveDTO = null;
      if (boundUpdateFn) {
        boundUpdateFn(currentId, toSave);
      }
    }
  }

  const handleUnloadFlush = () => {
    flushAutoSave();
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      flushAutoSave();
    }
  };

  function initAutoSaveListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleUnloadFlush);
      window.addEventListener('pagehide', handleUnloadFlush);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }
  }

  function cleanupAutoSaveListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnloadFlush);
      window.removeEventListener('pagehide', handleUnloadFlush);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    }
  }

  return {
    saveStatus,
    isSaving,
    queueAutoSave,
    flushAutoSave,
    initAutoSaveListeners,
    cleanupAutoSaveListeners,
    isQuotaExceededError,
    handleQuotaExceeded,
  };
}
