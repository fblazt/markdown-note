import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  resetDb,
} from '../../server/utils/db';

describe('Server Storage: db.ts', () => {
  beforeEach(() => {
    resetDb();
  });

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
    });

    expect(newNote.id).toBeDefined();
    expect(newNote.title).toBe('New Test Note');
    expect(newNote.content).toBe('This is test content');
    expect(newNote.tags).toEqual(['test', 'unit']);
    expect(newNote.createdAt).toBeDefined();
    expect(newNote.updatedAt).toBeDefined();

    // Verify it exists in getAllNotes()
    const fetched = getNoteById(newNote.id);
    expect(fetched).toEqual(newNote);
  });

  it('createNote defaults content to empty string and tags to empty array', () => {
    const newNote = createNote({
      title: 'Minimal Note',
    });

    expect(newNote.content).toBe('');
    expect(newNote.tags).toEqual([]);
  });

  it('updateNote updates specified fields and refreshes updatedAt', async () => {
    const created = createNote({
      title: 'Original Title',
      content: 'Original Content',
      tags: ['orig'],
    });

    const originalUpdatedAt = created.updatedAt;

    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = updateNote(created.id, {
      title: 'Updated Title',
      content: 'Updated Content',
      tags: ['orig', 'updated'],
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.content).toBe('Updated Content');
    expect(updated?.tags).toEqual(['orig', 'updated']);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(originalUpdatedAt).getTime()
    );
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

  it('resetDb resets store to initial seed data', () => {
    createNote({ title: 'Temporary note' });
    deleteNote('seed-welcome-guide');

    resetDb();

    const notes = getAllNotes();
    expect(notes.some((n) => n.id === 'seed-welcome-guide')).toBe(true);
    expect(notes.some((n) => n.title === 'Temporary note')).toBe(false);
  });
});
