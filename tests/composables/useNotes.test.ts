import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotes } from '../../app/composables/useNotes';
import { useToast } from '../../app/composables/useToast';
import { useStorageQuota } from '../../app/composables/useStorageQuota';
import { resetDb, getNoteById, getAllFolders, getAllNotes, db } from '../../app/utils/db';
import * as dbUtils from '../../app/utils/db';
import type { Note } from '../../shared/types/note';

const TEST_FOLDERS = ['Guides', 'Projects', 'Code'];

const TEST_NOTES: Note[] = [
  {
    id: 'seed-welcome-guide',
    title: '✨ Welcome to Markdown Notes',
    content: `# Welcome to Markdown Notes\n\nA blazing fast, distraction-free markdown note-taking app.\n\nMarkdown Syntax Cheat Sheet\nguides and features`,
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
    content: `# Markdown Note App Architecture\n\nProject Architecture & Roadmap overview`,
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
    content: `# Useful TypeScript & Nuxt Snippets\n\nsnippets and code examples`,
    tags: ['typescript', 'snippets', 'code'],
    folder: 'Code',
    createdAt: '2025-01-03T14:15:00.000Z',
    updatedAt: '2025-01-03T14:15:00.000Z',
    deletedAt: null,
    syncStatus: 'synced',
  },
];

describe('Composable: useNotes', () => {
  let composable: ReturnType<typeof useNotes>;
  let localStorageStore: Record<string, string> = {};

  beforeEach(async () => {
    vi.useRealTimers();
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

    await resetDb();
    await db.folders.bulkAdd(TEST_FOLDERS.map((name) => ({ name, deletedAt: null, syncStatus: 'synced' })));
    await db.notes.bulkAdd(TEST_NOTES);
    composable = useNotes();
    await composable.fetchNotes();
    composable.expandedFolders.value = ['Guides', 'Projects', 'Code'];
    composable.selectedFolder.value = null;
    composable.selectedNoteId.value = 'seed-welcome-guide';
    composable.searchQuery.value = '';
    composable.selectedTag.value = null;
    composable.saveStatus.value = 'idle';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('computes activeNote based on selectedNoteId', () => {
    expect(composable.activeNote.value?.id).toBe('seed-welcome-guide');
    expect(composable.activeNote.value?.title).toContain('Welcome');

    composable.selectNote('seed-project-roadmap');
    expect(composable.activeNote.value?.id).toBe('seed-project-roadmap');
    expect(composable.activeNote.value?.title).toContain('Project Architecture');

    composable.selectNote('non-existent');
    expect(composable.activeNote.value).toBeNull();
  });

  it('computes allTags sorted without duplicates', () => {
    const tags = composable.allTags.value;
    expect(tags).toEqual(['architecture', 'code', 'diagram', 'guide', 'markdown', 'mermaid', 'nuxt', 'roadmap', 'snippets', 'typescript', 'welcome']);
  });

  it('filters notes by search query across title, content, tags, and folder', () => {
    composable.searchQuery.value = 'architecture';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-project-roadmap');

    composable.searchQuery.value = 'cheat sheet';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-welcome-guide');

    composable.searchQuery.value = 'snippets';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-code-snippets');

    composable.searchQuery.value = 'guides';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-welcome-guide');

    composable.searchQuery.value = 'non-matching-query';
    expect(composable.filteredNotes.value.length).toBe(0);
  });

  it('filters notes by tag selection', () => {
    composable.toggleTagFilter('guide');
    expect(composable.selectedTag.value).toBe('guide');
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-welcome-guide');

    // Toggling the same tag clears the filter
    composable.toggleTagFilter('guide');
    expect(composable.selectedTag.value).toBeNull();
    expect(composable.filteredNotes.value.length).toBe(3);
  });

  it('computes notesByFolder and rootNotes correctly', () => {
    expect(composable.notesByFolder.value['Guides']?.length).toBe(1);
    expect(composable.notesByFolder.value['Projects']?.length).toBe(1);
    expect(composable.notesByFolder.value['Code']?.length).toBe(1);

    expect(composable.rootNotes.value.length).toBe(0);
  });

  it('filters notes by selectedFolder', () => {
    composable.selectedFolder.value = 'Guides';
    expect(composable.filteredNotes.value.length).toBe(1);
    expect(composable.filteredNotes.value[0]?.id).toBe('seed-welcome-guide');

    composable.selectedFolder.value = '__root__';
    expect(composable.filteredNotes.value.length).toBe(0);

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

  it('computes folderTree hierarchical structure correctly with depth and children', async () => {
    await composable.createFolder('Projects/Frontend/Vue');
    await composable.createNote({
      title: 'Vue Component',
      content: 'Content',
      tags: [],
      folder: 'Projects/Frontend/Vue',
    });
    await composable.fetchNotes();

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
    expect(composable.folders.value.some((f) => f.name === 'Projects/Backend')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Backend')).toBe(true);
  });

  it('moves folder under target parent via moveFolder', async () => {
    await composable.createFolder('Projects/Frontend');
    await composable.createFolder('Archive');
    await composable.createNote({
      title: 'Frontend note',
      content: 'Content',
      tags: [],
      folder: 'Projects/Frontend',
    });
    await composable.fetchNotes();

    composable.expandedFolders.value = ['Projects', 'Projects/Frontend'];

    const success = await composable.moveFolder('Projects/Frontend', 'Archive');
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.title === 'Frontend note')?.folder).toBe('Archive/Frontend');
    expect(composable.expandedFolders.value.includes('Archive/Frontend')).toBe(true);
  });

  it('moveFolder un-nests subfolder to top-level root when targetParent is empty', async () => {
    await composable.createFolder('Projects/Frontend');
    await composable.createNote({
      title: 'Frontend note',
      content: 'Content',
      tags: [],
      folder: 'Projects/Frontend',
    });
    await composable.fetchNotes();

    const success = await composable.moveFolder('Projects/Frontend', '');
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.title === 'Frontend note')?.folder).toBe('Frontend');
  });

  it('moveFolder rejects moving folder into itself or its own descendant', async () => {
    const res1 = await composable.moveFolder('Projects', 'Projects');
    expect(res1).toBe(false);

    const res2 = await composable.moveFolder('Projects', 'Projects/Frontend');
    expect(res2).toBe(false);
  });

  it('moves note to folder and expands all ancestor folders', async () => {
    await composable.moveNoteToFolder('seed-code-snippets', 'Projects/Frontend/Components');
    expect(composable.notes.value.find((n) => n.id === 'seed-code-snippets')?.folder).toBe('Projects/Frontend/Components');
    expect(composable.expandedFolders.value.includes('Projects')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Frontend')).toBe(true);
    expect(composable.expandedFolders.value.includes('Projects/Frontend/Components')).toBe(true);
  });

  it('creates folder and auto-expands it', async () => {
    const success = await composable.createFolder('Architecture');
    expect(success).toBe(true);
    expect(composable.folders.value.some((f) => f.name === 'Architecture')).toBe(true);
    expect(composable.expandedFolders.value.includes('Architecture')).toBe(true);
  });

  it('renames folder and updates local notes and expandedFolders', async () => {
    const success = await composable.renameFolder('Guides', 'Docs');
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.id === 'seed-welcome-guide')?.folder).toBe('Docs');
    expect(composable.expandedFolders.value.includes('Docs')).toBe(true);
  });

  it('deletes folder and updates local state', async () => {
    const success = await composable.deleteFolder('Guides', false);
    expect(success).toBe(true);
    expect(composable.notes.value.find((n) => n.id === 'seed-welcome-guide')?.folder).toBeUndefined();
    expect(composable.expandedFolders.value.includes('Guides')).toBe(false);
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
    expect(composable.selectedNoteId.value).toBe(created?.id);
    expect(composable.saveStatus.value).toBe('saved');
  });

  it('deletes note and transitions to adjacent note using selectNextNote', async () => {
    // Current notes: [seed-code-snippets, seed-project-roadmap, seed-welcome-guide]
    expect(composable.notes.value.length).toBe(3);
    const firstId = composable.notes.value[0]!.id;
    const middleId = composable.notes.value[1]!.id;
    const lastId = composable.notes.value[2]!.id;

    // 1. Deleting middle active note should select next adjacent note (lastId)
    composable.selectNote(middleId);
    expect(composable.selectedNoteId.value).toBe(middleId);

    await composable.deleteNote(middleId);
    expect(composable.notes.value.some((n) => n.id === middleId)).toBe(false);
    expect(composable.selectedNoteId.value).toBe(lastId);

    // 2. Deleting last active note should select previous adjacent note (firstId)
    await composable.deleteNote(lastId);
    expect(composable.notes.value.some((n) => n.id === lastId)).toBe(false);
    expect(composable.selectedNoteId.value).toBe(firstId);

    // 3. Deleting single remaining active note should set selectedNoteId to null
    await composable.deleteNote(firstId);
    expect(composable.notes.value.length).toBe(0);
    expect(composable.selectedNoteId.value).toBeNull();
  });

  it('selectNextNote transitions gracefully across notes list', () => {
    expect(composable.notes.value.length).toBe(3);
    const n0 = composable.notes.value[0]!.id;
    const n1 = composable.notes.value[1]!.id;
    const n2 = composable.notes.value[2]!.id;

    // At index 0 -> advances to index 1
    composable.selectNote(n0);
    composable.selectNextNote();
    expect(composable.selectedNoteId.value).toBe(n1);

    // At index 1 -> advances to index 2
    composable.selectNextNote();
    expect(composable.selectedNoteId.value).toBe(n2);

    // At index 2 (last) -> steps back to index 1
    composable.selectNextNote();
    expect(composable.selectedNoteId.value).toBe(n1);

    // Empty list -> sets to null
    composable.notes.value = [];
    composable.selectNextNote();
    expect(composable.selectedNoteId.value).toBeNull();
  });

  it('restoreNote restores a soft-deleted note, updates notes state, and selects it', async () => {
    // Soft delete a note first
    await composable.deleteNote('seed-welcome-guide');
    expect(composable.notes.value.some((n) => n.id === 'seed-welcome-guide')).toBe(false);

    // Restore note
    const restored = await composable.restoreNote('seed-welcome-guide');
    expect(restored).not.toBeNull();
    expect(restored?.id).toBe('seed-welcome-guide');
    expect(restored?.deletedAt).toBeNull();
    expect(restored?.syncStatus).toBe('pending');

    // State updated
    expect(composable.notes.value.some((n) => n.id === 'seed-welcome-guide')).toBe(true);
    expect(composable.selectedNoteId.value).toBe('seed-welcome-guide');
    expect(composable.expandedFolders.value.includes('Guides')).toBe(true);
  });

  it('restoreNote returns null if note does not exist', async () => {
    const res = await composable.restoreNote('completely-bogus-id');
    expect(res).toBeNull();
  });

  it('handles debounced auto-save queue with folder updates', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    composable.selectNote('seed-welcome-guide');
    composable.queueAutoSave({ content: 'Updated content live', folder: 'UpdatedFolder' }, 300);

    // Optimistic local update
    expect(composable.activeNote.value?.content).toBe('Updated content live');
    expect(composable.activeNote.value?.folder).toBe('UpdatedFolder');
    expect(composable.saveStatus.value).toBe('unsaved');

    // Advance timer past debounce threshold
    await vi.advanceTimersByTimeAsync(350);
    vi.useRealTimers();

    // Allow async Dexie operation to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(composable.saveStatus.value).toBe('saved');
    const note = await getNoteById('seed-welcome-guide');
    expect(note?.content).toBe('Updated content live');
    expect(note?.folder).toBe('UpdatedFolder');
  });

  it('flushes auto-save immediately on flushAutoSave()', async () => {
    composable.selectNote('seed-welcome-guide');
    composable.queueAutoSave({ title: 'Immediate Save Title' });
    expect(composable.saveStatus.value).toBe('unsaved');

    composable.flushAutoSave();

    // Allow async Dexie operation to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    const note = await getNoteById('seed-welcome-guide');
    expect(note?.title).toBe('Immediate Save Title');
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

      composable.openNote('seed-project-roadmap');

      expect(composable.selectedNoteId.value).toBe('seed-project-roadmap');
      expect(composable.activeNote.value?.title).toContain('Project Architecture');
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

  describe('Persistence and Draft Backup', () => {
    it('persists selectedNoteId to localStorage on selectNote and createNote', async () => {
      composable.selectNote('seed-project-roadmap');
      expect(localStorage.getItem('markdown-note-active-note-id')).toBe('seed-project-roadmap');

      const created = await composable.createNote({ title: 'Brand New Note' });
      expect(localStorage.getItem('markdown-note-active-note-id')).toBe(created?.id);
    });

    it('restores selectedNoteId from localStorage during fetchNotes if valid', async () => {
      localStorage.setItem('markdown-note-active-note-id', 'seed-project-roadmap');
      composable.selectedNoteId.value = null;

      await composable.fetchNotes();
      expect(composable.selectedNoteId.value).toBe('seed-project-roadmap');
    });

    it('falls back to first note if stored selectedNoteId is not in notes list during fetchNotes', async () => {
      localStorage.setItem('markdown-note-active-note-id', 'non-existent-note-id');
      composable.selectedNoteId.value = null;

      await composable.fetchNotes();
      expect(composable.selectedNoteId.value).toBe(composable.notes.value[0]?.id);
      expect(localStorage.getItem('markdown-note-active-note-id')).toBe(composable.notes.value[0]?.id);
    });

    it('saves draft to localStorage on queueAutoSave and clears it upon successful save', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      composable.selectNote('seed-welcome-guide');
      composable.queueAutoSave({ content: 'Work in progress draft content' }, 300);

      expect(localStorage.getItem('markdown-note-draft-seed-welcome-guide')).toBe('Work in progress draft content');

      await vi.advanceTimersByTimeAsync(350);
      vi.useRealTimers();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(localStorage.getItem('markdown-note-draft-seed-welcome-guide')).toBeNull();
    });

    it('removes draft from localStorage when note is deleted', async () => {
      localStorage.setItem('markdown-note-draft-seed-welcome-guide', 'Some lingering draft');
      await composable.deleteNote('seed-welcome-guide');

      expect(localStorage.getItem('markdown-note-draft-seed-welcome-guide')).toBeNull();
    });

    it('restores draft content when fetchNotes loads notes with existing drafts', async () => {
      localStorage.setItem('markdown-note-draft-seed-code-snippets', 'Restored draft content from browser storage');

      await composable.fetchNotes();

      const note3 = composable.notes.value.find((n) => n.id === 'seed-code-snippets');
      expect(note3?.content).toBe('Restored draft content from browser storage');
    });

    it('persists expandedFolders to localStorage when modified', async () => {
      composable.toggleFolder('Guides');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stored = localStorage.getItem('markdown-note-expanded-folders');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).not.toContain('Guides');
    });
  });

  describe('Storage Quota Revalidation & Alerts', () => {
    it('triggers warning toast when creating note while storage is near limit', async () => {
      const { toasts, clearAllToasts } = useToast();
      clearAllToasts();

      const mockStorage = {
        estimate: vi.fn().mockResolvedValue({
          usage: 850 * 1024 * 1024,
          quota: 1024 * 1024 * 1024,
        }),
        persisted: vi.fn().mockResolvedValue(false),
      };
      vi.stubGlobal('navigator', { storage: mockStorage });

      const created = await composable.createNote({ title: 'Note near limit' });
      expect(created).not.toBeNull();
      expect(toasts.value.length).toBeGreaterThan(0);
      expect(toasts.value[0]?.title).toContain('Storage');
      expect(toasts.value[0]?.type).toBe('warning');
    });

    it('sets saveStatus to error, marks quota as exceeded, and shows danger toast on QuotaExceededError', async () => {
      const { toasts, clearAllToasts } = useToast();
      const { quotaInfo } = useStorageQuota();
      clearAllToasts();

      const quotaError = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      vi.spyOn(dbUtils, 'updateNote').mockRejectedValueOnce(quotaError);

      const result = await composable.updateNote('seed-welcome-guide', { content: 'Exceeding content' });
      expect(result).toBeNull();
      expect(composable.saveStatus.value).toBe('error');
      expect(quotaInfo.value.status).toBe('exceeded');
      expect(toasts.value.some((t) => t.type === 'danger' && t.title.includes('Quota Exceeded'))).toBe(true);
    });

    it('triggers storage quota refresh on note deletion', async () => {
      const mockStorage = {
        estimate: vi.fn().mockResolvedValue({
          usage: 50 * 1024 * 1024,
          quota: 1024 * 1024 * 1024,
        }),
        persisted: vi.fn().mockResolvedValue(true),
      };
      vi.stubGlobal('navigator', { storage: mockStorage });

      await composable.deleteNote('seed-welcome-guide');
      expect(mockStorage.estimate).toHaveBeenCalled();
    });
  });
});

