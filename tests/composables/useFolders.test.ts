import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref } from 'vue';
import { useFolders, buildFolderTree, flattenFolderTree } from '../../app/composables/useFolders';
import { resetDb, db } from '../../app/utils/db';
import type { Note, FolderInfo } from '../../shared/types/note';

describe('Composable: useFolders', () => {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Pure Tree Utilities', () => {
    it('buildFolderTree creates hierarchical tree correctly', () => {
      const folders: FolderInfo[] = [
        { name: 'Projects' },
        { name: 'Projects/Web' },
        { name: 'Projects/Web/Frontend' },
        { name: 'Guides' },
      ];
      const notes: Note[] = [
        {
          id: 'n1',
          title: 'Web Note',
          content: 'Hello',
          folder: 'Projects/Web',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'n2',
          title: 'Frontend Note',
          content: 'World',
          folder: 'Projects/Web/Frontend',
          createdAt: '',
          updatedAt: '',
        },
      ];

      const tree = buildFolderTree(folders, notes);
      expect(tree).toHaveLength(2); // Guides, Projects

      const guidesNode = tree.find((n) => n.name === 'Guides');
      expect(guidesNode).toBeDefined();
      expect(guidesNode?.depth).toBe(0);
      expect(guidesNode?.noteCount).toBe(0);

      const projectsNode = tree.find((n) => n.name === 'Projects');
      expect(projectsNode).toBeDefined();
      expect(projectsNode?.children).toHaveLength(1);

      const webNode = projectsNode?.children[0];
      expect(webNode?.name).toBe('Web');
      expect(webNode?.path).toBe('Projects/Web');
      expect(webNode?.noteCount).toBe(1);
      expect(webNode?.children).toHaveLength(1);

      const frontendNode = webNode?.children[0];
      expect(frontendNode?.name).toBe('Frontend');
      expect(frontendNode?.path).toBe('Projects/Web/Frontend');
      expect(frontendNode?.noteCount).toBe(1);
    });

    it('flattenFolderTree flattens tree with indentation labels', () => {
      const folders: FolderInfo[] = [
        { name: 'Projects' },
        { name: 'Projects/Web' },
      ];
      const tree = buildFolderTree(folders, []);
      const flattened = flattenFolderTree(tree);

      expect(flattened).toHaveLength(2);
      expect(flattened[0]?.label).toBe('Projects');
      expect(flattened[1]?.label).toBe('  ↳ Web');
    });
  });

  describe('Folder State & CRUD Operations', () => {
    it('fetchFolders populates folders ref from database', async () => {
      await db.folders.bulkAdd([
        { name: 'FolderA', deletedAt: null, syncStatus: 'synced' },
        { name: 'FolderB', deletedAt: null, syncStatus: 'synced' },
      ]);

      const { folders, folderList, fetchFolders } = useFolders();
      await fetchFolders();

      expect(folders.value).toHaveLength(2);
      expect(folderList.value[0]?.name).toBe('FolderA');
      expect(folderList.value[1]?.name).toBe('FolderB');
    });

    it('toggleFolder, expandAllFolders, and collapseAllFolders manage expansion state', () => {
      const { folders, expandedFolders, toggleFolder, expandAllFolders, collapseAllFolders, isFolderExpanded } = useFolders();
      folders.value = [{ name: 'Docs' }, { name: 'Projects' }];
      expandedFolders.value = [];

      toggleFolder('Docs');
      expect(expandedFolders.value).toContain('Docs');
      expect(isFolderExpanded('Docs')).toBe(true);

      toggleFolder('Docs');
      expect(expandedFolders.value).not.toContain('Docs');
      expect(isFolderExpanded('Docs')).toBe(false);

      expandAllFolders();
      expect(expandedFolders.value).toEqual(['Docs', 'Projects']);

      collapseAllFolders();
      expect(expandedFolders.value).toEqual([]);
    });

    it('createFolder and createSubfolder add folders and auto-expand them', async () => {
      const { folders, expandedFolders, createFolder, createSubfolder } = useFolders();

      const success = await createFolder('Deep/Nested/Folder');
      expect(success).toBe(true);
      expect(folders.value.some((f) => f.name === 'Deep/Nested/Folder')).toBe(true);
      expect(expandedFolders.value).toContain('Deep');
      expect(expandedFolders.value).toContain('Deep/Nested');
      expect(expandedFolders.value).toContain('Deep/Nested/Folder');

      const subSuccess = await createSubfolder('Deep/Nested/Folder', 'Sub');
      expect(subSuccess).toBe(true);
      expect(folders.value.some((f) => f.name === 'Deep/Nested/Folder/Sub')).toBe(true);
    });

    it('renameFolder updates database, notes in memory, and expanded folders', async () => {
      const notesRef = ref<Note[]>([
        {
          id: 'note-1',
          title: 'My Note',
          content: '',
          folder: 'OldName/Sub',
          createdAt: '',
          updatedAt: '',
        },
      ]);
      const selectedIdRef = ref<string | null>('note-1');

      const { createFolder, renameFolder, expandedFolders, selectedFolder } = useFolders(notesRef, selectedIdRef);
      await createFolder('OldName');
      await createFolder('OldName/Sub');
      expandedFolders.value = ['OldName', 'OldName/Sub'];
      selectedFolder.value = 'OldName';

      const success = await renameFolder('OldName', 'NewName');
      expect(success).toBe(true);
      expect(notesRef.value[0]?.folder).toBe('NewName/Sub');
      expect(expandedFolders.value).toContain('NewName');
      expect(expandedFolders.value).toContain('NewName/Sub');
      expect(selectedFolder.value).toBe('NewName');
    });

    it('moveFolder moves folder hierarchy and prevents cyclical moves', async () => {
      const notesRef = ref<Note[]>([
        {
          id: 'note-1',
          title: 'Moved Note',
          content: '',
          folder: 'SourceFolder',
          createdAt: '',
          updatedAt: '',
        },
      ]);

      const { createFolder, moveFolder } = useFolders(notesRef);
      await createFolder('SourceFolder');
      await createFolder('TargetFolder');

      // Attempt invalid cycle
      const cycleSuccess = await moveFolder('SourceFolder', 'SourceFolder/Sub');
      expect(cycleSuccess).toBe(false);

      const success = await moveFolder('SourceFolder', 'TargetFolder');
      expect(success).toBe(true);
      expect(notesRef.value[0]?.folder).toBe('TargetFolder/SourceFolder');
    });

    it('deleteFolder removes folder and handles note cascades', async () => {
      const notesRef = ref<Note[]>([
        {
          id: 'n1',
          title: 'Note 1',
          content: '',
          folder: 'ToDelete',
          createdAt: '',
          updatedAt: '',
        },
      ]);
      const selectedIdRef = ref<string | null>('n1');

      const { createFolder, deleteFolder } = useFolders(notesRef, selectedIdRef);
      await createFolder('ToDelete');

      // Delete folder without deleting notes -> notes become uncategorized
      const success = await deleteFolder('ToDelete', false);
      expect(success).toBe(true);
      expect(notesRef.value[0]?.folder).toBeUndefined();

      // Recreate and delete with cascade
      notesRef.value[0]!.folder = 'ToDeleteAgain';
      await createFolder('ToDeleteAgain');
      await deleteFolder('ToDeleteAgain', true);
      expect(notesRef.value).toHaveLength(0);
    });
  });
});
