import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { useAutoSave, isQuotaExceededError } from '../../app/composables/useAutoSave';
import type { Note } from '../../shared/types/note';

describe('Composable: useAutoSave', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    localStorageStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('detects quota exceeded errors correctly across formats', () => {
    expect(isQuotaExceededError(new DOMException('QuotaExceededError', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaExceededError({ message: 'The quota has been exceeded.' })).toBe(true);
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError({ number: -2147024882 })).toBe(true);
    expect(isQuotaExceededError(new Error('Normal error'))).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });

  it('optimistically updates note content and writes draft to localStorage', () => {
    const notes = ref<Note[]>([
      {
        id: 'n-1',
        title: 'Original Title',
        content: 'Original Content',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    const selectedNoteId = ref<string | null>('n-1');
    const updateFn = vi.fn().mockResolvedValue(notes.value[0]);

    const { queueAutoSave, saveStatus } = useAutoSave({
      notes,
      selectedNoteId,
      onUpdateNote: updateFn,
    });

    queueAutoSave({ title: 'New Title', content: 'New Content' });

    expect(saveStatus.value).toBe('unsaved');
    expect(notes.value[0]?.title).toBe('New Title');
    expect(notes.value[0]?.content).toBe('New Content');
    expect(localStorageStore['markdown-note-draft-n-1']).toBe('New Content');
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('executes debounced update function after specified delay', async () => {
    const notes = ref<Note[]>([
      {
        id: 'n-1',
        title: 'Note 1',
        content: 'Draft 1',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    const selectedNoteId = ref<string | null>('n-1');
    const updateFn = vi.fn().mockResolvedValue(notes.value[0]);

    const { queueAutoSave } = useAutoSave({
      notes,
      selectedNoteId,
      onUpdateNote: updateFn,
    });

    queueAutoSave({ content: 'Updated A' }, 300);
    vi.advanceTimersByTime(200);
    expect(updateFn).not.toHaveBeenCalled();

    queueAutoSave({ content: 'Updated B' }, 300);
    vi.advanceTimersByTime(350);

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledWith('n-1', expect.objectContaining({ content: 'Updated B' }));
  });

  it('flushAutoSave immediately executes pending save without waiting for timer', () => {
    const notes = ref<Note[]>([
      {
        id: 'n-1',
        title: 'Note 1',
        content: 'Draft 1',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    const selectedNoteId = ref<string | null>('n-1');
    const updateFn = vi.fn().mockResolvedValue(notes.value[0]);

    const { queueAutoSave, flushAutoSave } = useAutoSave({
      notes,
      selectedNoteId,
      onUpdateNote: updateFn,
    });

    queueAutoSave({ content: 'Immediate Save' }, 1000);
    expect(updateFn).not.toHaveBeenCalled();

    flushAutoSave();
    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledWith('n-1', expect.objectContaining({ content: 'Immediate Save' }));
  });
});
