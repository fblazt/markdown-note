import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getAllFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  resetDb,
} from '../../server/utils/db';

describe('Server Storage: db.ts', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('Notes CRUD', () => {
    it('getAllNotes returns seed notes sorted by updatedAt descending', () => {
      const notes = getAllNotes();
      expect(notes.length).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < notes.length - 1; i++) {
        const current = new Date(notes[i]!.updatedAt).getTime();
        const next = new Date(notes[i + 1]!.updatedAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('getNoteById returns the note with matching id', () => {
      const note = getNoteById('seed-welcome-guide');
      expect(note).not.toBeNull();
      expect(note?.id).toBe('seed-welcome-guide');
      expect(note?.title).toContain('Welcome to Markdown Notes');
      expect(note?.folder).toBe('Guides');
    });

    it('getNoteById returns null for non-existent id', () => {
      const note = getNoteById('non-existent-id-12345');
      expect(note).toBeNull();
    });

    it('createNote creates a new note with valid ID, timestamps, and fields', () => {
      const newNote = createNote({
        title: 'New Test Note',
        content: 'This is test content',
        tags: ['test', 'unit'],
        folder: 'Work',
      });

      expect(newNote.id).toBeDefined();
      expect(newNote.title).toBe('New Test Note');
      expect(newNote.content).toBe('This is test content');
      expect(newNote.tags).toEqual(['test', 'unit']);
      expect(newNote.folder).toBe('Work');
      expect(newNote.createdAt).toBeDefined();
      expect(newNote.updatedAt).toBeDefined();

      // Verify it exists in getAllNotes()
      const fetched = getNoteById(newNote.id);
      expect(fetched).toEqual(newNote);

      // Verify folder was added to getAllFolders()
      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Work')).toBe(true);
    });

    it('createNote defaults content to empty string and tags to empty array', () => {
      const newNote = createNote({
        title: 'Minimal Note',
      });

      expect(newNote.content).toBe('');
      expect(newNote.tags).toEqual([]);
      expect(newNote.folder).toBeUndefined();
    });

    it('updateNote updates specified fields and refreshes updatedAt', async () => {
      const created = createNote({
        title: 'Original Title',
        content: 'Original Content',
        tags: ['orig'],
        folder: 'OldFolder',
      });

      const originalUpdatedAt = created.updatedAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = updateNote(created.id, {
        title: 'Updated Title',
        content: 'Updated Content',
        tags: ['orig', 'updated'],
        folder: 'NewFolder',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.content).toBe('Updated Content');
      expect(updated?.tags).toEqual(['orig', 'updated']);
      expect(updated?.folder).toBe('NewFolder');
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('updateNote unsets folder when empty string is provided', () => {
      const created = createNote({
        title: 'Note in folder',
        folder: 'Temporary',
      });

      const updated = updateNote(created.id, {
        folder: '',
      });

      expect(updated).not.toBeNull();
      expect(updated?.folder).toBeUndefined();
    });

    it('updateNote returns null for non-existent note', () => {
      const result = updateNote('non-existent-id', {
        title: 'Should fail',
      });
      expect(result).toBeNull();
    });

    it('deleteNote removes existing note and returns true', () => {
      const created = createNote({ title: 'To be deleted' });
      const result = deleteNote(created.id);

      expect(result).toBe(true);
      expect(getNoteById(created.id)).toBeNull();
    });

    it('deleteNote returns false for non-existent note', () => {
      const result = deleteNote('non-existent-id-999');
      expect(result).toBe(false);
    });
  });

  describe('Folders CRUD', () => {
    it('getAllFolders returns seed folders sorted alphabetically with note counts', () => {
      const folders = getAllFolders();
      expect(folders.length).toBe(3);
      expect(folders.map((f) => f.name)).toEqual(['Code', 'Guides', 'Projects']);

      const guides = folders.find((f) => f.name === 'Guides');
      expect(guides?.noteCount).toBe(1);
    });

    it('createFolder creates a new folder successfully', () => {
      const created = createFolder('Finance');
      expect(created).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Finance')).toBe(true);
      const finance = folders.find((f) => f.name === 'Finance');
      expect(finance?.noteCount).toBe(0);
    });

    it('createFolder returns false for empty or duplicate names', () => {
      expect(createFolder('')).toBe(false);
      expect(createFolder('   ')).toBe(false);
      expect(createFolder('Guides')).toBe(false);
    });

    it('createFolder auto-registers intermediate parent paths for nested subfolders', () => {
      const created = createFolder('Development/Frontend/Vue');
      expect(created).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Development')).toBe(true);
      expect(folders.some((f) => f.name === 'Development/Frontend')).toBe(true);
      expect(folders.some((f) => f.name === 'Development/Frontend/Vue')).toBe(true);
    });

    it('createFolder normalizes slashes and whitespace', () => {
      const created = createFolder('   Work // Tasks / Q3 /  ');
      expect(created).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Work/Tasks/Q3')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Tasks')).toBe(true);
      expect(folders.some((f) => f.name === 'Work')).toBe(true);
    });

    it('renameFolder renames folder and cascades to all subfolders and notes', () => {
      createFolder('Projects/Frontend/React');
      createNote({ title: 'React Guide', folder: 'Projects/Frontend/React' });
      createNote({ title: 'Top Project Note', folder: 'Projects' });

      const renamed = renameFolder('Projects', 'Work');
      expect(renamed).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Work')).toBe(true);
      expect(folders.some((f) => f.name === 'Work/Frontend/React')).toBe(true);
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);
      expect(folders.some((f) => f.name === 'Projects/Frontend/React')).toBe(false);

      const allNotes = getAllNotes();
      const reactNote = allNotes.find((n) => n.title === 'React Guide');
      const topNote = allNotes.find((n) => n.title === 'Top Project Note');
      expect(reactNote?.folder).toBe('Work/Frontend/React');
      expect(topNote?.folder).toBe('Work');
    });

    it('renameFolder prevents renaming into own descendant path', () => {
      createFolder('Projects/Frontend');
      expect(renameFolder('Projects', 'Projects/Frontend/Nested')).toBe(false);
    });

    it('renameFolder returns false if source folder does not exist or target exists', () => {
      expect(renameFolder('NonExistent', 'NewName')).toBe(false);
      expect(renameFolder('Guides', 'Code')).toBe(false);
      expect(renameFolder('Guides', '')).toBe(false);
    });

    it('deleteFolder with deleteNotes=false moves nested notes to root (unsets folder)', () => {
      createFolder('Projects/Frontend');
      createNote({ title: 'Sub note', folder: 'Projects/Frontend' });

      const deleted = deleteFolder('Projects', false);
      expect(deleted).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);
      expect(folders.some((f) => f.name === 'Projects/Frontend')).toBe(false);

      const subNote = getAllNotes().find((n) => n.title === 'Sub note');
      const roadmapNote = getNoteById('seed-project-roadmap');
      expect(subNote?.folder).toBeUndefined();
      expect(roadmapNote?.folder).toBeUndefined();
    });

    it('deleteFolder with deleteNotes=true removes folder, subfolders, and all nested notes', () => {
      createFolder('Projects/Frontend');
      createNote({ title: 'Sub note to delete', folder: 'Projects/Frontend' });

      const deleted = deleteFolder('Projects', true);
      expect(deleted).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Projects')).toBe(false);
      expect(folders.some((f) => f.name === 'Projects/Frontend')).toBe(false);

      const subNote = getAllNotes().find((n) => n.title === 'Sub note to delete');
      const roadmapNote = getNoteById('seed-project-roadmap');
      expect(subNote).toBeUndefined();
      expect(roadmapNote).toBeNull();
    });

    it('deleteFolder returns false for non-existent folder', () => {
      expect(deleteFolder('NonExistentFolder')).toBe(false);
      expect(deleteFolder('')).toBe(false);
    });

    it('moveFolder moves folder under new parent folder and cascades subfolders and notes', () => {
      createFolder('Apps/Mobile/iOS');
      createFolder('Archive');
      createNote({ title: 'iOS App', folder: 'Apps/Mobile/iOS' });

      const moved = moveFolder('Apps/Mobile', 'Archive');
      expect(moved).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Archive/Mobile')).toBe(true);
      expect(folders.some((f) => f.name === 'Archive/Mobile/iOS')).toBe(true);
      expect(folders.some((f) => f.name === 'Apps/Mobile')).toBe(false);

      const iosNote = getAllNotes().find((n) => n.title === 'iOS App');
      expect(iosNote?.folder).toBe('Archive/Mobile/iOS');
    });

    it('moveFolder moves folder to root when targetParentPath is empty', () => {
      createFolder('Categories/Design');
      createNote({ title: 'Design System', folder: 'Categories/Design' });

      const moved = moveFolder('Categories/Design', '');
      expect(moved).toBe(true);

      const folders = getAllFolders();
      expect(folders.some((f) => f.name === 'Design')).toBe(true);
      expect(folders.some((f) => f.name === 'Categories/Design')).toBe(false);

      const designNote = getAllNotes().find((n) => n.title === 'Design System');
      expect(designNote?.folder).toBe('Design');
    });

    it('moveFolder prevents cycle/self-drop when moving into own descendant or itself', () => {
      createFolder('Root/Child/Grandchild');
      expect(moveFolder('Root', 'Root')).toBe(false);
      expect(moveFolder('Root', 'Root/Child')).toBe(false);
      expect(moveFolder('Root', 'Root/Child/Grandchild')).toBe(false);
    });
  });

  describe('resetDb', () => {
    it('resetDb resets notes and folders to initial seed values', () => {
      createNote({ title: 'Temporary note', folder: 'TempFolder/Sub' });
      deleteNote('seed-welcome-guide');
      deleteFolder('Code', true);

      resetDb();

      const notes = getAllNotes();
      expect(notes.some((n) => n.id === 'seed-welcome-guide')).toBe(true);
      expect(notes.some((n) => n.title === 'Temporary note')).toBe(false);

      const folders = getAllFolders();
      expect(folders.map((f) => f.name)).toEqual(['Code', 'Guides', 'Projects']);
    });
  });

  describe('Filesystem Disk Persistence', () => {
    const storageFile = path.resolve(process.cwd(), '.data', 'storage', 'notes.json');

    it('persists data to .data/storage/notes.json upon mutations', () => {
      expect(fs.existsSync(storageFile)).toBe(true);

      const created = createNote({
        title: 'Persisted Note',
        content: 'Disk content test',
        folder: 'DiskFolder',
      });

      const raw = fs.readFileSync(storageFile, 'utf-8');
      const data = JSON.parse(raw);
      expect(data).toHaveProperty('notes');
      expect(data).toHaveProperty('folders');
      expect(data.notes.some((n: any) => n.id === created.id && n.title === 'Persisted Note')).toBe(true);
      expect(data.folders).toContain('DiskFolder');

      updateNote(created.id, { title: 'Updated Persisted Note' });
      const rawAfterUpdate = fs.readFileSync(storageFile, 'utf-8');
      const dataAfterUpdate = JSON.parse(rawAfterUpdate);
      const found = dataAfterUpdate.notes.find((n: any) => n.id === created.id);
      expect(found.title).toBe('Updated Persisted Note');

      deleteNote(created.id);
      const rawAfterDelete = fs.readFileSync(storageFile, 'utf-8');
      const dataAfterDelete = JSON.parse(rawAfterDelete);
      expect(dataAfterDelete.notes.some((n: any) => n.id === created.id)).toBe(false);
    });

    it('persists folder creation and deletion to disk', () => {
      createFolder('NewDiskFolder');
      let data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      expect(data.folders).toContain('NewDiskFolder');

      deleteFolder('NewDiskFolder', false);
      data = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      expect(data.folders).not.toContain('NewDiskFolder');
    });
  });
});
