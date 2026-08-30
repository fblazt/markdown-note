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
  restoreNote,
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
    it('getAllNotes returns non-deleted notes sorted by updatedAt descending', async () => {
      const notes = await getAllNotes();
      expect(notes.length).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < notes.length - 1; i++) {
        const timeA = new Date(notes[i]!.updatedAt).getTime();
        const timeB = new Date(notes[i + 1]!.updatedAt).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    });

    it('getAllNotes ignores soft-deleted notes', async () => {
      const initialCount = (await getAllNotes()).length;
      await deleteNote('seed-welcome-guide');

      const afterNotes = await getAllNotes();
      expect(afterNotes.length).toBe(initialCount - 1);
      expect(afterNotes.some((n) => n.id === 'seed-welcome-guide')).toBe(false);
    });

    it('getNoteById returns note if found and not deleted, null otherwise', async () => {
      const welcomeNote = await getNoteById('seed-welcome-guide');
      expect(welcomeNote).not.toBeNull();
      expect(welcomeNote?.title).toContain('Welcome');

      // Soft delete note
      await deleteNote('seed-welcome-guide');
      const deletedFetched = await getNoteById('seed-welcome-guide');
      expect(deletedFetched).toBeNull();

      const nonExistent = await getNoteById('non-existent-id');
      expect(nonExistent).toBeNull();
    });

    it('createNote creates a note with id, timestamp, tags, deletedAt null, syncStatus pending, and writes upsert to mutationQueue', async () => {
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
      expect(created.deletedAt).toBeNull();
      expect(created.syncStatus).toBe('pending');

      // Check folder auto-registration
      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects/Backend')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects/Backend/API')).toBe(true);

      const fetched = await getNoteById(created.id);
      expect(fetched).toEqual(created);

      // Verify mutationQueue contains note upsert mutation with baseUpdatedAt: null
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === created.id
      );
      expect(noteMutations.length).toBe(1);
      expect(noteMutations[0]?.action).toBe('upsert');
      expect(noteMutations[0]?.baseUpdatedAt).toBeNull();
      expect((noteMutations[0]?.data as Note).title).toBe('New Feature Doc');
    });

    it('createNote provides default title if empty', async () => {
      const created = await createNote({ title: '   ', content: 'Empty title test' });
      expect(created.title).toBe('Untitled Note');
    });

    it('updateNote updates fields, sets syncStatus pending, auto-registers new folder, and logs upsert mutation with baseUpdatedAt', async () => {
      const existing = await db.notes.get('seed-welcome-guide');
      const originalUpdatedAt = existing!.updatedAt;

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
      expect(updated?.syncStatus).toBe('pending');
      expect(updated?.deletedAt).toBeNull();

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Guides/Intro')).toBe(true);

      // Verify mutationQueue has upsert with baseUpdatedAt
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-welcome-guide'
      );
      expect(noteMutations.length).toBe(1);
      expect(noteMutations[0]?.action).toBe('upsert');
      expect(noteMutations[0]?.baseUpdatedAt).toBe(originalUpdatedAt);
      expect((noteMutations[0]?.data as Note).title).toBe('Updated Welcome Guide');
    });

    it('updateNote returns null for non-existent or soft-deleted note', async () => {
      const result = await updateNote('unknown-id', { title: 'Test' });
      expect(result).toBeNull();

      await deleteNote('seed-welcome-guide');
      const deletedResult = await updateNote('seed-welcome-guide', { title: 'Should Fail' });
      expect(deletedResult).toBeNull();
    });

    it('deleteNote performs soft delete with tombstone and logs delete mutation with baseUpdatedAt', async () => {
      const existing = await db.notes.get('seed-welcome-guide');
      const originalUpdatedAt = existing!.updatedAt;

      const success = await deleteNote('seed-welcome-guide');
      expect(success).toBe(true);

      // getNoteById returns null for soft-deleted note
      const fetched = await getNoteById('seed-welcome-guide');
      expect(fetched).toBeNull();

      // Dexie table contains tombstone record
      const rawNote = await db.notes.get('seed-welcome-guide');
      expect(rawNote).toBeDefined();
      expect(rawNote?.deletedAt).not.toBeNull();
      expect(typeof rawNote?.deletedAt).toBe('string');
      expect(rawNote?.syncStatus).toBe('pending');

      // mutationQueue contains delete mutation
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-welcome-guide'
      );
      expect(noteMutations.length).toBe(1);
      expect(noteMutations[0]?.action).toBe('delete');
      expect(noteMutations[0]?.baseUpdatedAt).toBe(originalUpdatedAt);

      // Subsequent delete returns false
      const fail = await deleteNote('seed-welcome-guide');
      expect(fail).toBe(false);
    });

    it('restoreNote clears deletedAt, sets syncStatus pending, and enqueues upsert mutation', async () => {
      await deleteNote('seed-welcome-guide');
      const tombstone = await db.notes.get('seed-welcome-guide');
      const tombstoneUpdatedAt = tombstone!.updatedAt;

      const restored = await restoreNote('seed-welcome-guide');
      expect(restored).not.toBeNull();
      expect(restored?.id).toBe('seed-welcome-guide');
      expect(restored?.deletedAt).toBeNull();
      expect(restored?.syncStatus).toBe('pending');

      const fetched = await getNoteById('seed-welcome-guide');
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe(restored?.title);

      // mutationQueue should now have the restore upsert mutation
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-welcome-guide'
      );
      // Had delete mutation, now also has upsert mutation
      expect(noteMutations.length).toBe(2);
      const restoreMutation = noteMutations.find((m) => m.action === 'upsert');
      expect(restoreMutation).toBeDefined();
      expect(restoreMutation?.baseUpdatedAt).toBe(tombstoneUpdatedAt);
      expect((restoreMutation?.data as Note).deletedAt).toBeNull();
    });

    it('restoreNote returns null for non-existent note', async () => {
      const nonExistent = await restoreNote('non-existent-note');
      expect(nonExistent).toBeNull();
    });
  });

  describe('Folder Hierarchy & Operations', () => {
    it('getAllFolders returns folders with accurate direct note counts excluding deleted notes', async () => {
      const folders = await getAllFolders();
      const guides = folders.find((f) => f.name === 'Guides');
      const projects = folders.find((f) => f.name === 'Projects');
      const code = folders.find((f) => f.name === 'Code');

      expect(guides?.noteCount).toBe(1);
      expect(projects?.noteCount).toBe(1);
      expect(code?.noteCount).toBe(1);

      // Soft delete note in Guides
      await deleteNote('seed-welcome-guide');
      const updatedFolders = await getAllFolders();
      const updatedGuides = updatedFolders.find((f) => f.name === 'Guides');
      expect(updatedGuides?.noteCount).toBe(0);
    });

    it('createFolder registers folder and intermediate parent paths and enqueues upsert mutations', async () => {
      const success = await createFolder('Work/Clients/Acme');
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Work')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Clients')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Clients/Acme')).toBe(true);

      // Check folder mutations
      const mutations = (await db.mutationQueue.toArray()).filter((m) => m.entityType === 'folder');
      expect(mutations.some((m) => m.entityId === 'Work' && m.action === 'upsert')).toBe(true);
      expect(mutations.some((m) => m.entityId === 'Work/Clients' && m.action === 'upsert')).toBe(true);
      expect(mutations.some((m) => m.entityId === 'Work/Clients/Acme' && m.action === 'upsert')).toBe(true);

      // Duplicate returns false
      const dup = await createFolder('Work/Clients/Acme');
      expect(dup).toBe(false);

      // Invalid returns false
      const invalid = await createFolder('   ');
      expect(invalid).toBe(false);
    });

    it('renameFolder renames folder, cascades to subfolders & notes, and enqueues folder/note mutations', async () => {
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

      // Verify folder delete and upsert mutations
      const folderMutations = (await db.mutationQueue.toArray()).filter((m) => m.entityType === 'folder');
      expect(folderMutations.some((m) => m.entityId === 'Projects' && m.action === 'delete')).toBe(true);
      expect(folderMutations.some((m) => m.entityId === 'Workspace' && m.action === 'upsert')).toBe(true);

      // Verify note upsert mutations
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-project-roadmap'
      );
      expect(noteMutations.some((m) => m.action === 'upsert' && (m.data as Note).folder === 'Workspace')).toBe(true);
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

    it('deleteFolder with deleteNotes=false unlinks notes and enqueues upsert mutations for notes', async () => {
      const success = await deleteFolder('Guides', false);
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Guides')).toBe(false);

      const note = await getNoteById('seed-welcome-guide');
      expect(note).not.toBeNull();
      expect(note?.folder).toBeUndefined();

      // Mutation queue checks
      const folderMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'folder' && m.entityId === 'Guides'
      );
      expect(folderMutations.some((m) => m.action === 'delete')).toBe(true);

      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-welcome-guide'
      );
      expect(noteMutations.some((m) => m.action === 'upsert' && !(m.data as Note).folder)).toBe(true);
    });

    it('deleteFolder with deleteNotes=true soft deletes folder and all nested notes with delete mutations', async () => {
      const success = await deleteFolder('Projects', true);
      expect(success).toBe(true);

      const folders = await getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);

      const note = await getNoteById('seed-project-roadmap');
      expect(note).toBeNull();

      // Check Dexie raw note record is soft deleted
      const rawNote = await db.notes.get('seed-project-roadmap');
      expect(rawNote?.deletedAt).not.toBeNull();

      // Check note delete mutation
      const noteMutations = (await db.mutationQueue.toArray()).filter(
        (m) => m.entityType === 'note' && m.entityId === 'seed-project-roadmap'
      );
      expect(noteMutations.some((m) => m.action === 'delete')).toBe(true);
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
