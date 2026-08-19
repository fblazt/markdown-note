import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotes } from '../../app/composables/useNotes';
import type { Note } from '../../shared/types/note';

const MOCK_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Vue 3 Guide',
    content: 'Learn Vue 3 composition API',
    tags: ['vue', 'frontend'],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'note-2',
    title: 'Nitro Backend',
    content: 'Fullstack server engine with Nitro',
    tags: ['nitro', 'backend'],
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'note-3',
    title: 'Markdown Tips',
    content: 'Writing notes efficiently with markdown syntax',
    tags: ['markdown'],
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
];

describe('Composable: useNotes', () => {
  let composable: ReturnType<typeof useNotes>;

  beforeEach(() => {
    vi.useFakeTimers();
    composable = useNotes();
    composable.notes.value = JSON.parse(JSON.stringify(MOCK_NOTES));
    composable.selectedNoteId.value = 'note-1';
    composable.searchQuery.value = '';
    composable.selectedTag.value = null;
    composable.saveStatus.value = 'idle';

    // Mock global $fetch
    globalThis.$fetch = vi.fn(async (url: string, opts?: any) => {
      if (url === '/api/notes' && opts?.method === 'POST') {
        return {
          id: 'new-note-id',
          title: opts.body.title,
          content: opts.body.content,
          tags: opts.body.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      if (url.startsWith('/api/notes/') && opts?.method === 'PUT') {
        const id = url.split('/').pop();
        return {
          id,
          ...opts.body,
          updatedAt: new Date().toISOString(),
        };
      }
      if (url.startsWith('/api/notes/') && opts?.method === 'DELETE') {
        return { success: true };
      }
      return MOCK_NOTES;
    }) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('computes activeNote based on selectedNoteId', () => {
    expect(composable.activeNote.value?.id).toBe('note-1');
    expect(composable.activeNote.value?.title).toBe('Vue 3 Guide');

    composable.selectNote('note-2');
    expect(composable.activeNote.value?.id).toBe('note-2');
    expect(composable.activeNote.value?.title).toBe('Nitro Backend');

    composable.selectNote('non-existent');
    expect(composable.activeNote.value).toBeNull();
  });

  it('computes allTags sorted without duplicates', () => {
    const tags = composable.allTags.value;
    expect(tags).toEqual(['backend', 'frontend', 'markdown', 'nitro', 'vue']);
  });

  it('filters notes by search query across title, content, and tags', () => {
    composable.searchQuery.value = 'backend';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-2');

    composable.searchQuery.value = 'composition';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-1');

    composable.searchQuery.value = 'syntax';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-3');

    composable.searchQuery.value = 'non-matching-query';
    expect(composable.filteredNotes.value.length).toBe(0);
  });

  it('filters notes by tag selection', () => {
    composable.toggleTagFilter('frontend');
    expect(composable.selectedTag.value).toBe('frontend');
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-1');

    // Toggling the same tag clears the filter
    composable.toggleTagFilter('frontend');
    expect(composable.selectedTag.value).toBeNull();
    expect(composable.filteredNotes.value.length).toBe(3);
  });

  it('creates note and updates state', async () => {
    const created = await composable.createNote({
      title: 'Created by Test',
      content: 'Hello World',
      tags: ['new'],
    });

    expect(created).not.toBeNull();
    expect(created?.title).toBe('Created by Test');
    expect(composable.notes.value[0]?.title).toBe('Created by Test');
    expect(composable.selectedNoteId.value).toBe('new-note-id');
    expect(composable.saveStatus.value).toBe('saved');
  });

  it('deletes note and selects remaining note', async () => {
    await composable.deleteNote('note-1');
    expect(composable.notes.value.some((n) => n.id === 'note-1')).toBe(false);
    expect(composable.selectedNoteId.value).toBe('note-2');
  });

  it('handles debounced auto-save queue', async () => {
    composable.selectNote('note-1');
    composable.queueAutoSave({ content: 'Updated content live' }, 300);

    // Optimistic local update
    expect(composable.activeNote.value?.content).toBe('Updated content live');
    expect(composable.saveStatus.value).toBe('unsaved');

    // Advance timer past debounce threshold
    await vi.advanceTimersByTimeAsync(350);

    expect(composable.saveStatus.value).toBe('saved');
    expect(globalThis.$fetch).toHaveBeenCalledWith(
      '/api/notes/note-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ content: 'Updated content live' }),
      })
    );
  });

  it('flushes auto-save immediately on flushAutoSave()', async () => {
    composable.selectNote('note-1');
    composable.queueAutoSave({ title: 'Immediate Save Title' });
    expect(composable.saveStatus.value).toBe('unsaved');

    composable.flushAutoSave();

    expect(globalThis.$fetch).toHaveBeenCalledWith(
      '/api/notes/note-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ title: 'Immediate Save Title' }),
      })
    );
  });

  it('switches view mode correctly', () => {
    composable.isMobile.value = false;
    composable.setViewMode('editor');
    expect(composable.viewMode.value).toBe('editor');

    composable.setViewMode('preview');
    expect(composable.viewMode.value).toBe('preview');

    composable.setViewMode('split');
    expect(composable.viewMode.value).toBe('split');
  });

  describe('Mobile helpers and navigation', () => {
    it('computes effectiveViewMode correctly for desktop and mobile', () => {
      composable.isMobile.value = false;
      composable.viewMode.value = 'split';
      expect(composable.effectiveViewMode.value).toBe('split');

      composable.isMobile.value = true;
      expect(composable.effectiveViewMode.value).toBe('editor');

      composable.viewMode.value = 'preview';
      expect(composable.effectiveViewMode.value).toBe('preview');

      composable.viewMode.value = 'editor';
      expect(composable.effectiveViewMode.value).toBe('editor');
    });

    it('openNote selects note and adjusts state on mobile', () => {
      composable.isMobile.value = true;
      composable.isSidebarOpen.value = true;
      composable.viewMode.value = 'split';

      composable.openNote('note-2');

      expect(composable.selectedNoteId.value).toBe('note-2');
      expect(composable.activeNote.value?.title).toBe('Nitro Backend');
      expect(composable.isSidebarOpen.value).toBe(false);
      expect(composable.viewMode.value).toBe('editor');
    });

    it('navigateBackToList opens sidebar', () => {
      composable.isSidebarOpen.value = false;
      composable.navigateBackToList();
      expect(composable.isSidebarOpen.value).toBe(true);
    });

    it('createNote on mobile closes sidebar and sets editor view', async () => {
      composable.isMobile.value = true;
      composable.isSidebarOpen.value = true;
      composable.viewMode.value = 'split';

      const created = await composable.createNote({
        title: 'Mobile Note',
        content: 'Testing mobile create',
      });

      expect(created).not.toBeNull();
      expect(composable.isSidebarOpen.value).toBe(false);
      expect(composable.viewMode.value).toBe('editor');
    });

    it('setViewMode on mobile prevents split mode', () => {
      composable.isMobile.value = true;
      composable.setViewMode('split');
      expect(composable.viewMode.value).toBe('editor');

      composable.setViewMode('preview');
      expect(composable.viewMode.value).toBe('preview');
    });
  });
});
