import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotes } from '../../app/composables/useNotes';
import type { Note, FolderInfo } from '../../shared/types/note';

const MOCK_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Vue 3 Guide',
    content: 'Learn Vue 3 composition API',
    tags: ['vue', 'frontend'],
    folder: 'Guides',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'note-2',
    title: 'Nitro Backend',
    content: 'Fullstack server engine with Nitro',
    tags: ['nitro', 'backend'],
    folder: 'Projects',
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'note-3',
    title: 'Markdown Tips',
    content: 'Writing notes efficiently with markdown syntax',
    tags: ['markdown'],
    // Uncategorized / Root
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
];

const MOCK_FOLDERS: FolderInfo[] = [
  { name: 'Code', noteCount: 0 },
  { name: 'Guides', noteCount: 1 },
  { name: 'Projects', noteCount: 1 },
];

describe('Composable: useNotes', () => {
  let composable: ReturnType<typeof useNotes>;

  beforeEach(() => {
    vi.useFakeTimers();
    composable = useNotes();
    composable.notes.value = JSON.parse(JSON.stringify(MOCK_NOTES));
    composable.folders.value = JSON.parse(JSON.stringify(MOCK_FOLDERS));
    composable.expandedFolders.value = ['Guides', 'Projects', 'Code'];
    composable.selectedFolder.value = null;
    composable.selectedNoteId.value = 'note-1';
    composable.searchQuery.value = '';
    composable.selectedTag.value = null;
    composable.saveStatus.value = 'idle';

    let mockFoldersList = JSON.parse(JSON.stringify(MOCK_FOLDERS));

    // Mock global $fetch
    globalThis.$fetch = vi.fn(async (url: string, opts?: any) => {
      if (url === '/api/folders' && (!opts || opts?.method === 'GET')) {
        const all = new Set<string>(mockFoldersList.map((f: any) => f.name));
        for (const f of composable.folders.value) {
          all.add(f.name);
        }
        for (const n of composable.notes.value) {
          if (n.folder) {
            const segs = n.folder.split('/');
            let cur = '';
            for (const s of segs) {
              cur = cur ? `${cur}/${s}` : s;
              all.add(cur);
            }
          }
        }
        return Array.from(all).map((name) => ({
          name,
          noteCount: composable.notes.value.filter((n) => n.folder === name).length,
        }));
      }
      if (url === '/api/folders' && opts?.method === 'POST') {
        const newFolder = { name: opts.body.name, noteCount: 0 };
        mockFoldersList.push(newFolder);
        return {
          success: true,
          name: opts.body.name,
        };
      }
      if (url.startsWith('/api/folders/') && opts?.method === 'PUT') {
        const oldName = decodeURIComponent(url.split('/').pop() || '');
        let newName = opts.body.newName;
        if (opts.body.targetParent !== undefined) {
          const base = oldName.split('/').pop();
          newName = opts.body.targetParent ? `${opts.body.targetParent}/${base}` : base;
        }
        for (const f of mockFoldersList) {
          if (f.name === oldName) {
            f.name = newName;
          } else if (f.name.startsWith(oldName + '/')) {
            f.name = newName + f.name.slice(oldName.length);
          }
        }
        const segs = newName.split('/');
        let cur = '';
        for (const s of segs) {
          cur = cur ? `${cur}/${s}` : s;
          if (!mockFoldersList.some((f: any) => f.name === cur)) {
            mockFoldersList.push({ name: cur, noteCount: 0 });
          }
        }
        return {
          success: true,
          oldName,
          newName,
        };
      }
      if (url.startsWith('/api/folders/') && opts?.method === 'DELETE') {
        const nameToDelete = decodeURIComponent(url.split('?')[0]?.split('/').pop() || '');
        mockFoldersList = mockFoldersList.filter((f: any) => f.name !== nameToDelete);
        return {
          success: true,
          name: nameToDelete,
        };
      }
      if (url === '/api/notes' && opts?.method === 'POST') {
        if (opts.body?.folder) {
          const segs = opts.body.folder.split('/');
          let cur = '';
          for (const s of segs) {
            cur = cur ? `${cur}/${s}` : s;
            if (!mockFoldersList.some((f: any) => f.name === cur)) {
              mockFoldersList.push({ name: cur, noteCount: 0 });
            }
          }
        }
        return {
          id: 'new-note-id',
          title: opts.body.title,
          content: opts.body.content,
          tags: opts.body.tags || [],
          folder: opts.body.folder,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      if (url.startsWith('/api/notes/') && opts?.method === 'PUT') {
        const id = url.split('/').pop();
        if (opts.body?.folder) {
          const segs = opts.body.folder.split('/');
          let cur = '';
          for (const s of segs) {
            cur = cur ? `${cur}/${s}` : s;
            if (!mockFoldersList.some((f: any) => f.name === cur)) {
              mockFoldersList.push({ name: cur, noteCount: 0 });
            }
          }
        }
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

  it('filters notes by search query across title, content, tags, and folder', () => {
    composable.searchQuery.value = 'backend';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-2');

    composable.searchQuery.value = 'composition';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-1');

    composable.searchQuery.value = 'syntax';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-3');

    composable.searchQuery.value = 'guides';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-1');

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

  it('computes notesByFolder and rootNotes correctly', () => {
    expect(composable.notesByFolder.value['Guides']?.length).toBe(1);
    expect(composable.notesByFolder.value['Projects']?.length).toBe(1);
    expect(composable.notesByFolder.value['Code']?.length).toBe(0);

    expect(composable.rootNotes.value.length).toBe(1);
    expect(composable.rootNotes.value[0]?.id).toBe('note-3');
  });

  it('filters notes by selectedFolder', () => {
    composable.selectedFolder.value = 'Guides';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-1');

    composable.selectedFolder.value = '__root__';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('note-3');

    composable.selectedFolder.value = null;
    expect(composable.filteredNotes.value.length).toBe(3);
  });

  it('handles folder expansion toggle, expand all, and collapse all', () => {
    composable.toggleFolder('Guides');
    expect(composable.expandedFolders.value.includes('Guides')).toBe(false);

    composable.toggleFolder('Guides');
    expect(composable.expandedFolders.value.includes('Guides')).toBe(true);

    composable.collapseAllFolders();
    expect(composable.expandedFolders.value.length).toBe(0);

    composable.expandAllFolders();
    expect(composable.expandedFolders.value).toEqual(['Code', 'Guides', 'Projects']);
  });

  it('computes folderTree hierarchical structure correctly with depth and children', () => {
    composable.folders.value = [
      { name: 'Code', noteCount: 0 },
      { name: 'Guides', noteCount: 1 },
      { name: 'Projects', noteCount: 0 },
      { name: 'Projects/Frontend', noteCount: 0 },
      { name: 'Projects/Frontend/Vue', noteCount: 1 },
    ];
    composable.notes.value = [
      {
        id: 'note-1',
        title: 'Vue 3 Guide',
        content: 'Content',
        tags: [],
        folder: 'Guides',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'note-2',
        title: 'Vue Component',
        content: 'Content',
        tags: [],
        folder: 'Projects/Frontend/Vue',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    const tree = composable.folderTree.value;
    expect(tree.length).toBe(3); // Code, Guides, Projects

    const projectsNode = tree.find((n) => n.name === 'Projects');
    expect(projectsNode).toBeDefined();
    expect(projectsNode?.depth).toBe(0);
    expect(projectsNode?.path).toBe('Projects');
    expect(projectsNode?.children.length).toBe(1);

    const frontendNode = projectsNode?.children[0];
    expect(frontendNode?.name).toBe('Frontend');
    expect(frontendNode?.depth).toBe(1);
    expect(frontendNode?.path).toBe('Projects/Frontend');
    expect(frontendNode?.children.length).toBe(1);

    const vueNode = frontendNode?.children[0];
    expect(vueNode?.name).toBe('Vue');
    expect(vueNode?.depth).toBe(2);
    expect(vueNode?.path).toBe('Projects/Frontend/Vue');
    expect(vueNode?.noteCount).toBe(1);
  });

  it('creates subfolder and auto-expands parent and child paths', async () => {
    const success = await composable.createSubfolder('Projects', 'Backend');
    expect(success).toBe(true);
    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/folders', {
      method: 'POST',
      body: { name: 'Projects/Backend' },
    });
    expect(composable.expandedFolders.value.includes('Projects')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Backend')).toBe(true);
  });

  it('moves folder under target parent via moveFolder', async () => {
    composable.folders.value = [
      { name: 'Projects', noteCount: 0 },
      { name: 'Projects/Frontend', noteCount: 1 },
      { name: 'Archive', noteCount: 0 },
    ];
    composable.notes.value = [
      {
        id: 'note-1',
        title: 'Frontend note',
        content: 'Content',
        tags: [],
        folder: 'Projects/Frontend',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];
    composable.expandedFolders.value = ['Projects', 'Projects/Frontend'];

    const success = await composable.moveFolder('Projects/Frontend', 'Archive');
    expect(success).toBe(true);
    expect(globalThis.$fetch).toHaveBeenCalledWith(
      `/api/folders/${encodeURIComponent('Projects/Frontend')}`,
      {
        method: 'PUT',
        body: { targetParent: 'Archive' },
      }
    );
    expect(composable.notes.value[0]?.folder).toBe('Archive/Frontend');
    expect(composable.expandedFolders.value.includes('Archive/Frontend')).toBe(true);
  });

  it('moveFolder un-nests subfolder to top-level root when targetParent is empty', async () => {
    composable.notes.value = [
      {
        id: 'note-1',
        title: 'Frontend note',
        content: 'Content',
        tags: [],
        folder: 'Projects/Frontend',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    const success = await composable.moveFolder('Projects/Frontend', '');
    expect(success).toBe(true);
    expect(composable.notes.value[0]?.folder).toBe('Frontend');
  });

  it('moveFolder rejects moving folder into itself or its own descendant', async () => {
    const res1 = await composable.moveFolder('Projects', 'Projects');
    expect(res1).toBe(false);

    const res2 = await composable.moveFolder('Projects', 'Projects/Frontend');
    expect(res2).toBe(false);
  });

  it('moves note to folder and expands all ancestor folders', async () => {
    await composable.moveNoteToFolder('note-3', 'Projects/Frontend/Components');
    expect(globalThis.$fetch).toHaveBeenCalledWith(
      '/api/notes/note-3',
      expect.objectContaining({
        method: 'PUT',
        body: { folder: 'Projects/Frontend/Components' },
      })
    );
    expect(composable.expandedFolders.value.includes('Projects')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Frontend')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Frontend/Components')).toBe(true);
  });

  it('creates folder and auto-expands it', async () => {
    const success = await composable.createFolder('Architecture');
    expect(success).toBe(true);
    expect(globalThis.$fetch).toHaveBeenCalledWith('/api/folders', {
      method: 'POST',
      body: { name: 'Architecture' },
    });
    expect(composable.expandedFolders.value.includes('Architecture')).toBe(true);
  });

  it('renames folder and updates local notes and expandedFolders', async () => {
    const success = await composable.renameFolder('Guides', 'Docs');
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.id === 'note-1')?.folder).toBe('Docs');
    expect(composable.expandedFolders.value.includes('Docs')).toBe(true);
  });

  it('deletes folder and updates local state', async () => {
    const success = await composable.deleteFolder('Guides', false);
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.id === 'note-1')?.folder).toBeUndefined();
    expect(composable.expandedFolders.value.includes('Guides')).toBe(false);
  });

  it('moves note to folder via moveNoteToFolder', async () => {
    await composable.moveNoteToFolder('note-3', 'Code');
    expect(globalThis.$fetch).toHaveBeenCalledWith(
      '/api/notes/note-3',
      expect.objectContaining({
        method: 'PUT',
        body: { folder: 'Code' },
      })
    );
  });

  it('creates note and updates state with folder assignment', async () => {
    composable.selectedFolder.value = 'Guides';
    const created = await composable.createNote({
      title: 'Created in Guides',
      content: 'Hello World',
    });

    expect(created).not.toBeNull();
    expect(created?.title).toBe('Created in Guides');
    expect(created?.folder).toBe('Guides');
    expect(composable.notes.value[0]?.title).toBe('Created in Guides');
    expect(composable.selectedNoteId.value).toBe('new-note-id');
    expect(composable.saveStatus.value).toBe('saved');
  });

  it('deletes note and selects remaining note', async () => {
    await composable.deleteNote('note-1');
    expect(composable.notes.value.some((n) => n.id === 'note-1')).toBe(false);
    expect(composable.selectedNoteId.value).toBe('note-2');
  });

  it('handles debounced auto-save queue with folder updates', async () => {
    composable.selectNote('note-1');
    composable.queueAutoSave({ content: 'Updated content live', folder: 'UpdatedFolder' }, 300);

    // Optimistic local update
    expect(composable.activeNote.value?.content).toBe('Updated content live');
    expect(composable.activeNote.value?.folder).toBe('UpdatedFolder');
    expect(composable.saveStatus.value).toBe('unsaved');

    // Advance timer past debounce threshold
    await vi.advanceTimersByTimeAsync(350);

    expect(composable.saveStatus.value).toBe('saved');
    expect(globalThis.$fetch).toHaveBeenCalledWith(
      '/api/notes/note-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ content: 'Updated content live', folder: 'UpdatedFolder' }),
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
