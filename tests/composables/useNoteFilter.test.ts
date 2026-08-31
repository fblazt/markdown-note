import { describe, it, expect, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useNoteFilter } from '../../app/composables/useNoteFilter';
import type { Note, FolderInfo } from '../../shared/types/note';

describe('Composable: useNoteFilter', () => {
  const sampleNotes: Note[] = [
    {
      id: 'n1',
      title: 'Guide to Vue',
      content: 'Vue 3 composition api tutorial',
      tags: ['vue', 'frontend'],
      folder: 'Guides/Frontend',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'n2',
      title: 'Nuxt Nitro Guide',
      content: 'Backend nitro proxy setup',
      tags: ['nuxt', 'backend'],
      folder: 'Guides/Backend',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'n3',
      title: 'Unfiled Idea',
      content: 'Random thought without folder',
      tags: ['ideas'],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const sampleFolders: FolderInfo[] = [
    { name: 'Guides' },
    { name: 'Guides/Frontend' },
    { name: 'Guides/Backend' },
  ];

  beforeEach(() => {
    const { clearFilters } = useNoteFilter();
    clearFilters();
  });

  it('computes allTags as a sorted unique array', () => {
    const notes = ref<Note[]>(sampleNotes);
    const { allTags } = useNoteFilter({ notes });

    expect(allTags.value).toEqual(['backend', 'frontend', 'ideas', 'nuxt', 'vue']);
  });

  it('filters notes by search query across title, content, tags, and folder', () => {
    const notes = ref<Note[]>(sampleNotes);
    const { searchQuery, searchAndTagFilteredNotes } = useNoteFilter({ notes });

    searchQuery.value = 'nitro';
    expect(searchAndTagFilteredNotes.value).toHaveLength(1);
    expect(searchAndTagFilteredNotes.value[0]?.id).toBe('n2');

    searchQuery.value = 'frontend';
    expect(searchAndTagFilteredNotes.value).toHaveLength(1);
    expect(searchAndTagFilteredNotes.value[0]?.id).toBe('n1');

    searchQuery.value = 'Guides';
    expect(searchAndTagFilteredNotes.value).toHaveLength(2);
  });

  it('filters notes by selectedTag and handles tag toggling', () => {
    const notes = ref<Note[]>(sampleNotes);
    const { selectedTag, searchAndTagFilteredNotes, toggleTagFilter, clearFilters } = useNoteFilter({ notes });

    toggleTagFilter('ideas');
    expect(selectedTag.value).toBe('ideas');
    expect(searchAndTagFilteredNotes.value).toHaveLength(1);
    expect(searchAndTagFilteredNotes.value[0]?.id).toBe('n3');

    // Toggle same tag off
    toggleTagFilter('ideas');
    expect(selectedTag.value).toBeNull();
    expect(searchAndTagFilteredNotes.value).toHaveLength(3);

    toggleTagFilter('vue');
    clearFilters();
    expect(selectedTag.value).toBeNull();
  });

  it('groups notes into notesByFolder and rootNotes', () => {
    const notes = ref<Note[]>(sampleNotes);
    const folders = ref<FolderInfo[]>(sampleFolders);
    const { notesByFolder, rootNotes } = useNoteFilter({ notes, folders });

    expect(rootNotes.value).toHaveLength(1);
    expect(rootNotes.value[0]?.id).toBe('n3');

    expect(notesByFolder.value['Guides/Frontend']).toHaveLength(1);
    expect(notesByFolder.value['Guides/Frontend']?.[0]?.id).toBe('n1');
    expect(notesByFolder.value['Guides/Backend']).toHaveLength(1);
  });

  it('auto-expands folder hierarchy when search query matches note in nested folder', async () => {
    const notes = ref<Note[]>(sampleNotes);
    const folders = ref<FolderInfo[]>(sampleFolders);
    const expandedFolders = ref<string[]>([]);

    const { searchQuery } = useNoteFilter({ notes, folders, expandedFolders });

    searchQuery.value = 'nitro';
    await nextTick();

    expect(expandedFolders.value).toContain('Guides');
    expect(expandedFolders.value).toContain('Guides/Backend');
  });
});
