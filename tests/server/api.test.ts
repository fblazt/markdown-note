import { describe, it, expect, beforeEach, vi } from 'vitest';
import getNotesHandler from '../../server/api/notes/index.get';
import createNoteHandler from '../../server/api/notes/index.post';
import getNoteByIdHandler from '../../server/api/notes/[id].get';
import updateNoteHandler from '../../server/api/notes/[id].put';
import deleteNoteHandler from '../../server/api/notes/[id].delete';
import { resetDb, getAllNotes } from '../../server/utils/db';
import type { H3Event } from 'h3';

function createMockEvent(options: {
  params?: Record<string, string>;
  body?: any;
} = {}): any {
  return {
    context: {
      params: options.params || {},
    },
    node: {
      req: {
        body: options.body,
      },
      res: {
        statusCode: 200,
      },
    },
    _body: options.body,
  };
}

// Mock H3 global utilities if not running inside full Nitro environment
if (typeof (globalThis as any).getRouterParam === 'undefined') {
  (globalThis as any).getRouterParam = (event: any, name: string) => {
    return event.context?.params?.[name];
  };
}

if (typeof (globalThis as any).readBody === 'undefined') {
  (globalThis as any).readBody = async (event: any) => {
    return event._body ?? event.node?.req?.body;
  };
}

if (typeof (globalThis as any).setResponseStatus === 'undefined') {
  (globalThis as any).setResponseStatus = (event: any, code: number) => {
    if (event.node?.res) {
      event.node.res.statusCode = code;
    }
  };
}

if (typeof (globalThis as any).createError === 'undefined') {
  (globalThis as any).createError = (input: { statusCode?: number; statusMessage?: string }) => {
    const err = new Error(input.statusMessage || 'H3 Error') as any;
    err.statusCode = input.statusCode || 500;
    err.statusMessage = input.statusMessage;
    return err;
  };
}

describe('Nitro API Handlers: /api/notes', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('GET /api/notes (index.get)', () => {
    it('returns all notes array', async () => {
      const event = createMockEvent();
      const result = await getNotesHandler(event);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
    });
  });

  describe('POST /api/notes (index.post)', () => {
    it('creates a new note and returns 201 status', async () => {
      const event = createMockEvent({
        body: {
          title: 'API Created Note',
          content: 'Content from test',
          tags: ['api', 'test'],
        },
      });

      const result = await createNoteHandler(event);
      expect(result).toBeDefined();
      expect(result.title).toBe('API Created Note');
      expect(result.content).toBe('Content from test');
      expect(result.tags).toEqual(['api', 'test']);
      expect(event.node.res.statusCode).toBe(201);

      const all = getAllNotes();
      expect(all.some((n) => n.id === result.id)).toBe(true);
    });

    it('throws 400 if title is missing or empty', async () => {
      const eventEmptyTitle = createMockEvent({
        body: { title: '   ', content: 'hello' },
      });

      await expect(createNoteHandler(eventEmptyTitle)).rejects.toMatchObject({
        statusCode: 400,
      });

      const eventNoBody = createMockEvent({ body: null });
      await expect(createNoteHandler(eventNoBody)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('GET /api/notes/:id ([id].get)', () => {
    it('returns note by id', async () => {
      const event = createMockEvent({
        params: { id: 'seed-welcome-guide' },
      });

      const result = await getNoteByIdHandler(event);
      expect(result).toBeDefined();
      expect(result.id).toBe('seed-welcome-guide');
    });

    it('throws 404 for unknown note id', async () => {
      const event = createMockEvent({
        params: { id: 'non-existent-123' },
      });

      await expect(getNoteByIdHandler(event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('PUT /api/notes/:id ([id].put)', () => {
    it('updates note and returns updated note', async () => {
      const event = createMockEvent({
        params: { id: 'seed-welcome-guide' },
        body: {
          title: 'Updated Welcome Title',
          content: 'Updated content here',
        },
      });

      const result = await updateNoteHandler(event);
      expect(result.title).toBe('Updated Welcome Title');
      expect(result.content).toBe('Updated content here');
    });

    it('throws 404 when updating non-existent note', async () => {
      const event = createMockEvent({
        params: { id: 'missing-id-404' },
        body: { title: 'New' },
      });

      await expect(updateNoteHandler(event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('DELETE /api/notes/:id ([id].delete)', () => {
    it('deletes existing note and returns success object', async () => {
      const event = createMockEvent({
        params: { id: 'seed-welcome-guide' },
      });

      const result = await deleteNoteHandler(event);
      expect(result).toEqual({
        success: true,
        id: 'seed-welcome-guide',
      });
    });

    it('throws 404 when deleting non-existent note', async () => {
      const event = createMockEvent({
        params: { id: 'seed-already-deleted' },
      });

      await expect(deleteNoteHandler(event)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
