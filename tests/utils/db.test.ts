import { describe, it, expect, beforeEach } from 'vitest';
import {
  db,
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getAllFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  seedInitialData,
  resetDb,
  normalizeFolderPath,
  INITIAL_FOLDERS,
  SEED_NOTES,
} from '../../app/utils/db';

describe('Database Utility (Dexie client-side IndexedDB)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe('normalizeFolderPath', () => {
    it('normalizes slashes, trims whitespace, and strips leading/trailing slashes', () => {
      expect(normalizeFolderPath('  Projects/Frontend/Vue  ')).toBe('Projects/Frontend/Vue');
      expect(normalizeFolderPath('/Projects//Frontend///Vue/')).toBe('Projects/Frontend/Vue');
      expect(normalizeFolderPath('   ')).toBe('');
      expect(normalizeFolderPath(undefined)).toBe('');
      expect(normalizeFolderPath('')).toBe('');
    });
  });

  describe('Database Seeding & Reset', () => {
    it('populates initial seed notes and folders on resetDb', async () => {
      const notes = await getAllNotes();
      const folders = await getAllFolders();

      expect(notes.length).toBe(SEED_NOTES.length);
      expect(folders.some((f) => f.name === 'Guides')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects')).toBe(true);
      expect(folders.some((f) => f.name === 'Code')).toBe(true);
    });

    it('seedInitialData does not overwrite existing data when db is not empty', async () => {
      await createNote({ title: 'Extra Note' });
      const initialCount = (await getAllNotes()).length;

      await seedInitialData();
      const afterCount = (await getAllNotes()).length;
      expect(afterCount).toBe(initialCount);
    });
  });

  describe('Note CRUD operations', () => {
    it('getAllNotes returns notes sorted by updatedAt descending', async () => {
      const notes = await getAllNotes();
      expect(notes.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < notes.length - 1; i++) {
        const timeA = new Date(notes[i]!.updatedAt).getTime();
        const timeB = new Date(notes[i + 1]!.updatedAt).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    });

    it('getNoteById returns note if found, null otherwise', async () => {
      const welcomeNote = await getNoteById('seed-welcome-guide');
      expect(welcomeNote).not.toBeNull();
      expect(welcomeNote?.title).toContain('Welcome');

      const nonExistent = await getNoteById('non-existent-id');
      expect(nonExistent).toBeNull();
    });

    it('createNote creates a note with id, timestamp, tags, and auto-registers folder', async () => {
      const created = await createNote({
        title: 'New Feature Doc',
        content: 'Documentation content',
        tags: ['docs', 'feature'],
        folder: 'Projects/Backend/API',
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('New Feature Doc');
      expect(created.content).toBe('Documentation content');
      expect(created.tags).toEqual(['docs', 'feature']);
      expect(created.folder).toBe('Projects/Backend/API');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      // Check folder auto-registration
      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects/Backend')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects/Backend/API')).toBe(true);

      const fetched = await getNoteById(created.id);
      expect(fetched).toEqual(created);
    });

    it('createNote provides default title if empty', async () => {
      const created = await createNote({ title: '   ', content: 'Empty title test' });
      expect(created.title).toBe('Untitled Note');
    });

    it('updateNote updates fields and auto-registers new folder', async () => {
      const updated = await updateNote('seed-welcome-guide', {
        title: 'Updated Welcome Guide',
        content: 'New content here',
        tags: ['updated', 'guide'],
        folder: 'Guides/Intro',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Welcome Guide');
      expect(updated?.content).toBe('New content here');
      expect(updated?.tags).toEqual(['updated', 'guide']);
      expect(updated?.folder).toBe('Guides/Intro');

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Guides/Intro')).toBe(true);
    });

    it('updateNote returns null for non-existent note', async () => {
      const result = await updateNote('unknown-id', { title: 'Test' });
      expect(result).toBeNull();
    });

    it('deleteNote removes note from database', async () => {
      const success = await deleteNote('seed-welcome-guide');
      expect(success).toBe(true);

      const fetched = await getNoteById('seed-welcome-guide');
      expect(fetched).toBeNull();

      const fail = await deleteNote('seed-welcome-guide');
      expect(fail).toBe(false);
    });
  });

  describe('Folder Hierarchy & Operations', () => {
    it('getAllFolders returns folders with accurate direct note counts', async () => {
      const folders = await getAllFolders();
      const guides = folders.find((f) => f.name === 'Guides');
      const projects = folders.find((f) => f.name === 'Projects');
      const code = folders.find((f) => f.name === 'Code');

      expect(guides?.noteCount).toBe(1);
      expect(projects?.noteCount).toBe(1);
      expect(code?.noteCount).toBe(1);
    });

    it('createFolder registers folder and intermediate parent paths', async () => {
      const success = await createFolder('Work/Clients/Acme');
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Work')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Clients')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Clients/Acme')).toBe(true);

      // Duplicate returns false
      const dup = await createFolder('Work/Clients/Acme');
      expect(dup).toBe(false);

      // Invalid returns false
      const invalid = await createFolder('   ');
      expect(invalid).toBe(false);
    });

    it('renameFolder renames folder and cascades to subfolders and notes', async () => {
      await createNote({
        title: 'Roadmap Child',
        folder: 'Projects/Frontend',
      });

      const success = await renameFolder('Projects', 'Workspace');
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Workspace')).toBe(true);
      expect(folders.some((f) => f.name === 'Workspace/Frontend')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);

      const roadmap = await getNoteById('seed-project-roadmap');
      expect(roadmap?.folder).toBe('Workspace');

      const allNotes = await getAllNotes();
      const child = allNotes.find((n) => n.title === 'Roadmap Child');
      expect(child?.folder).toBe('Workspace/Frontend');
    });

    it('renameFolder prevents cycle (renaming into descendant path)', async () => {
      const success = await renameFolder('Projects', 'Projects/Nested');
      expect(success).toBe(false);
    });

    it('renameFolder prevents renaming to an already existing distinct folder', async () => {
      const success = await renameFolder('Guides', 'Projects');
      expect(success).toBe(false);
    });

    it('renameFolder returns false if source folder does not exist', async () => {
      const success = await renameFolder('NonExistent', 'NewName');
      expect(success).toBe(false);
    });

    it('deleteFolder with deleteNotes=false unlinks notes without deleting them', async () => {
      const success = await deleteFolder('Guides', false);
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Guides')).toBe(false);

      const note = await getNoteById('seed-welcome-guide');
      expect(note).not.toBeNull();
      expect(note?.folder).toBeUndefined();
    });

    it('deleteFolder with deleteNotes=true removes folder and all nested notes', async () => {
      const success = await deleteFolder('Projects', true);
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);

      const note = await getNoteById('seed-project-roadmap');
      expect(note).toBeNull();
    });

    it('deleteFolder returns false for non-existent folder', async () => {
      const success = await deleteFolder('GhostFolder');
      expect(success).toBe(false);
    });

    it('moveFolder moves folder under target parent path', async () => {
      await createFolder('Projects/Frontend');
      const success = await moveFolder('Projects/Frontend', 'Guides');
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Guides/Frontend')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects/Frontend')).toBe(false);
    });

    it('moveFolder moves subfolder to top-level root when targetParentPath is empty', async () => {
      await createFolder('Projects/Frontend');
      const success = await moveFolder('Projects/Frontend', '');
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Frontend')).toBe(true);
    });

    it('moveFolder rejects moving folder into itself or its own descendant', async () => {
      const res1 = await moveFolder('Projects', 'Projects');
      expect(res1).toBe(false);

      const res2 = await moveFolder('Projects', 'Projects/Frontend');
      expect(res2).toBe(false);
    });
  });
});
