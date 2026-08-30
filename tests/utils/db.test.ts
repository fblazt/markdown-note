import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import {
  db,
  NotesDatabase,
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
import type { SyncMutation, SyncMeta } from '../../shared/types/note';

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
    it('populates initial seed notes and folders with syncStatus synced and deletedAt null on resetDb', async () => {
      const notes = await getAllNotes();
      const folders = await getAllFolders();
      const folderRecords = await db.folders.toArray();

      expect(notes.length).toBe(SEED_NOTES.length);
      for (const note of notes) {
        expect(note.deletedAt).toBeNull();
        expect(note.syncStatus).toBe('synced');
      }

      expect(folders.some((f) => f.name === 'Guides')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects')).toBe(true);
      expect(folders.some((f) => f.name === 'Code')).toBe(true);

      for (const folder of folderRecords) {
        expect(folder.deletedAt).toBeNull();
        expect(folder.syncStatus).toBe('synced');
      }

      // mutationQueue and syncMeta must be empty
      const mutations = await db.mutationQueue.toArray();
      const meta = await db.syncMeta.toArray();
      expect(mutations.length).toBe(0);
      expect(meta.length).toBe(0);
    });

    it('seedInitialData does not overwrite existing data when db is not empty', async () => {
      await createNote({ title: 'Extra Note' });
      const initialCount = (await getAllNotes()).length;

      await seedInitialData();
      const afterCount = (await getAllNotes()).length;
      expect(afterCount).toBe(initialCount);
    });
  });

  describe('Version 2 Schema & Tables', () => {
    it('provides mutationQueue table for storing and retrieving SyncMutation records', async () => {
      expect(db.mutationQueue).toBeDefined();

      const noteMutation: SyncMutation = {
        id: 'mut-note-1',
        entityType: 'note',
        entityId: 'note-123',
        action: 'upsert',
        data: {
          id: 'note-123',
          title: 'Queued Note',
          content: 'Queued Content',
          syncStatus: 'pending',
          deletedAt: null,
        },
        baseUpdatedAt: null,
        createdAt: '2026-08-30T10:00:00.000Z',
      };

      const folderMutation: SyncMutation = {
        id: 'mut-folder-1',
        entityType: 'folder',
        entityId: 'Work/Docs',
        action: 'delete',
        data: {
          name: 'Work/Docs',
          deletedAt: '2026-08-30T10:05:00.000Z',
          syncStatus: 'pending',
        },
        baseUpdatedAt: '2026-08-30T09:00:00.000Z',
        createdAt: '2026-08-30T10:05:00.000Z',
      };

      await db.mutationQueue.add(noteMutation);
      await db.mutationQueue.add(folderMutation);

      expect(await db.mutationQueue.count()).toBe(2);

      const retrievedNoteMut = await db.mutationQueue.get('mut-note-1');
      expect(retrievedNoteMut).toEqual(noteMutation);

      const retrievedFolderMut = await db.mutationQueue.get('mut-folder-1');
      expect(retrievedFolderMut).toEqual(folderMutation);

      await db.mutationQueue.delete('mut-note-1');
      expect(await db.mutationQueue.count()).toBe(1);
    });

    it('provides syncMeta table for storing and retrieving key-value metadata', async () => {
      expect(db.syncMeta).toBeDefined();

      const lastSync: SyncMeta = {
        key: 'lastSyncedAt',
        value: '2026-08-30T12:00:00.000Z',
      };
      const syncCursor: SyncMeta = {
        key: 'syncCursor',
        value: 'cursor_abc123',
      };

      await db.syncMeta.put(lastSync);
      await db.syncMeta.put(syncCursor);

      expect(await db.syncMeta.count()).toBe(2);

      const fetchedSync = await db.syncMeta.get('lastSyncedAt');
      expect(fetchedSync).toEqual(lastSync);

      const fetchedCursor = await db.syncMeta.get('syncCursor');
      expect(fetchedCursor).toEqual(syncCursor);

      // Overwrite existing key
      await db.syncMeta.put({ key: 'lastSyncedAt', value: '2026-08-30T13:00:00.000Z' });
      const updated = await db.syncMeta.get('lastSyncedAt');
      expect(updated?.value).toBe('2026-08-30T13:00:00.000Z');
      expect(await db.syncMeta.count()).toBe(2);
    });

    it('clearAllUserData clears all 4 tables without reseeding', async () => {
      // Ensure seed notes and folders exist
      expect(await db.notes.count()).toBeGreaterThan(0);
      expect(await db.folders.count()).toBeGreaterThan(0);

      // Add records into mutationQueue and syncMeta
      await db.mutationQueue.add({
        id: 'mut-clear-test',
        entityType: 'note',
        entityId: 'note-xyz',
        action: 'upsert',
        data: { title: 'To Clear' },
        createdAt: '2026-08-30T00:00:00.000Z',
      });
      await db.syncMeta.put({
        key: 'syncStatus',
        value: 'active',
      });

      expect(await db.mutationQueue.count()).toBe(1);
      expect(await db.syncMeta.count()).toBe(1);

      // Call clearAllUserData
      await db.clearAllUserData();

      expect(await db.notes.count()).toBe(0);
      expect(await db.folders.count()).toBe(0);
      expect(await db.mutationQueue.count()).toBe(0);
      expect(await db.syncMeta.count()).toBe(0);
    });
  });

  describe('Version 2 Database Migration (v1 -> v2 upgrade)', () => {
    it('applies version 2 upgrade hook to populate default syncStatus and deletedAt on legacy records', async () => {
      const upgradeTestDbName = `test-db-upgrade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Step 1: Initialize Database with Version 1 schema only
      const dbV1 = new Dexie(upgradeTestDbName);
      dbV1.version(1).stores({
        notes: 'id, title, folder, *tags, createdAt, updatedAt',
        folders: 'name',
      });

      await dbV1.open();

      // Insert legacy v1 records without deletedAt or syncStatus
      await dbV1.table('notes').bulkAdd([
        {
          id: 'v1-note-1',
          title: 'Legacy Note 1',
          content: 'Legacy content without sync fields',
          tags: ['legacy'],
          folder: 'LegacyFolder',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'v1-note-2',
          title: 'Legacy Note 2 with Custom syncStatus',
          content: 'Already has syncStatus',
          tags: [],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          syncStatus: 'synced',
          deletedAt: '2024-01-02T01:00:00.000Z',
        },
      ]);

      await dbV1.table('folders').bulkAdd([
        { name: 'LegacyFolder' },
        { name: 'SyncedFolder', syncStatus: 'synced', deletedAt: null },
      ]);

      dbV1.close();

      // Step 2: Open with NotesDatabase (which defines v1 + v2 with upgrade hook)
      const dbV2 = new NotesDatabase(upgradeTestDbName);
      await dbV2.open();

      // Verify v1-note-1 received defaults: syncStatus = 'pending', deletedAt = null
      const migratedNote1 = await dbV2.notes.get('v1-note-1');
      expect(migratedNote1).toBeDefined();
      expect(migratedNote1?.title).toBe('Legacy Note 1');
      expect(migratedNote1?.syncStatus).toBe('pending');
      expect(migratedNote1?.deletedAt).toBeNull();

      // Verify v1-note-2 preserved its existing syncStatus and deletedAt
      const migratedNote2 = await dbV2.notes.get('v1-note-2');
      expect(migratedNote2).toBeDefined();
      expect(migratedNote2?.syncStatus).toBe('synced');
      expect(migratedNote2?.deletedAt).toBe('2024-01-02T01:00:00.000Z');

      // Verify LegacyFolder received defaults: syncStatus = 'pending', deletedAt = null
      const migratedFolder1 = await dbV2.folders.get('LegacyFolder');
      expect(migratedFolder1).toBeDefined();
      expect(migratedFolder1?.syncStatus).toBe('pending');
      expect(migratedFolder1?.deletedAt).toBeNull();

      // Verify SyncedFolder preserved its existing syncStatus
      const migratedFolder2 = await dbV2.folders.get('SyncedFolder');
      expect(migratedFolder2).toBeDefined();
      expect(migratedFolder2?.syncStatus).toBe('synced');
      expect(migratedFolder2?.deletedAt).toBeNull();

      // Verify mutationQueue and syncMeta tables were created and accessible in v2
      expect(dbV2.mutationQueue).toBeDefined();
      expect(dbV2.syncMeta).toBeDefined();
      await dbV2.mutationQueue.add({
        id: 'mut-post-mig',
        entityType: 'note',
        entityId: 'v1-note-1',
        action: 'upsert',
        data: { title: 'Updated After Migration' },
        createdAt: '2026-08-30T10:00:00.000Z',
      });
      expect(await dbV2.mutationQueue.count()).toBe(1);

      await dbV2.delete();
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
