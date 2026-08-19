import { describe, it, expect, beforeEach } from 'vitest';
import getNotesHandler from '../../server/api/notes/index.get';
import createNoteHandler from '../../server/api/notes/index.post';
import getNoteByIdHandler from '../../server/api/notes/[id].get';
import updateNoteHandler from '../../server/api/notes/[id].put';
import deleteNoteHandler from '../../server/api/notes/[id].delete';
import getFoldersHandler from '../../server/api/folders/index.get';
import createFolderHandler from '../../server/api/folders/index.post';
import renameFolderHandler from '../../server/api/folders/[name].put';
import deleteFolderHandler from '../../server/api/folders/[name].delete';
import { resetDb, getAllNotes, getAllFolders, getNoteById, createFolder } from '../../server/utils/db';

function createMockEvent(options: {
  params?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
} = {}): any {
  return {
    context: {
      params: options.params || {},
      query: options.query || {},
    },
    node: {
      req: {
        body: options.body,
      },
      res: {
        statusCode: 200,
      },
    },
    query: options.query || {},
    _body: options.body,
  };
}

// Mock H3 global utilities if not running inside full Nitro environment
if (typeof (globalThis as any).getRouterParam === 'undefined') {
  (globalThis as any).getRouterParam = (event: any, name: string) => {
    return event.context?.params?.[name];
  };
}

if (typeof (globalThis as any).getQuery === 'undefined') {
  (globalThis as any).getQuery = (event: any) => {
    return event.context?.query || event.query || {};
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

describe('Nitro API Handlers', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('Notes API: /api/notes', () => {
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
      it('creates a new note with folder and returns 201 status', async () => {
        const event = createMockEvent({
          body: {
            title: 'API Created Note',
            content: 'Content from test',
            tags: ['api', 'test'],
            folder: 'TestFolder',
          },
        });

        const result = await createNoteHandler(event);
        expect(result).toBeDefined();
        expect(result.title).toBe('API Created Note');
        expect(result.content).toBe('Content from test');
        expect(result.tags).toEqual(['api', 'test']);
        expect(result.folder).toBe('TestFolder');
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
        expect(result.folder).toBe('Guides');
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
      it('updates note and returns updated note with new folder', async () => {
        const event = createMockEvent({
          params: { id: 'seed-welcome-guide' },
          body: {
            title: 'Updated Welcome Title',
            content: 'Updated content here',
            folder: 'NewGuides',
          },
        });

        const result = await updateNoteHandler(event);
        expect(result.title).toBe('Updated Welcome Title');
        expect(result.content).toBe('Updated content here');
        expect(result.folder).toBe('NewGuides');
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

  describe('Folders API: /api/folders', () => {
    describe('GET /api/folders (index.get)', () => {
      it('returns all folders with note count', async () => {
        const event = createMockEvent();
        const result = await getFoldersHandler(event);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
        expect(result.map((f: any) => f.name)).toEqual(['Code', 'Guides', 'Projects']);
      });
    });

    describe('POST /api/folders (index.post)', () => {
      it('creates new folder and returns 201 status', async () => {
        const event = createMockEvent({
          body: { name: 'Recipes' },
        });

        const result = await createFolderHandler(event);
        expect(result).toEqual({
          success: true,
          name: 'Recipes',
        });
        expect(event.node.res.statusCode).toBe(201);

        const folders = getAllFolders();
        expect(folders.some((f) => f.name === 'Recipes')).toBe(true);
      });

      it('throws 400 for empty folder name', async () => {
        const event = createMockEvent({
          body: { name: '   ' },
        });

        await expect(createFolderHandler(event)).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('throws 409 if folder already exists', async () => {
        const event = createMockEvent({
          body: { name: 'Guides' },
        });

        await expect(createFolderHandler(event)).rejects.toMatchObject({
          statusCode: 409,
        });
      });
    });

    describe('PUT /api/folders/:name ([name].put)', () => {
      it('renames existing folder', async () => {
        const event = createMockEvent({
          params: { name: 'Guides' },
          body: { newName: 'Documentation' },
        });

        const result = await renameFolderHandler(event);
        expect(result).toEqual({
          success: true,
          oldName: 'Guides',
          newName: 'Documentation',
        });

        const folders = getAllFolders();
        expect(folders.some((f) => f.name === 'Documentation')).toBe(true);
        expect(folders.some((f) => f.name === 'Guides')).toBe(false);
      });

      it('moves folder under another folder via targetParent', async () => {
        const event = createMockEvent({
          params: { name: 'Code' },
          body: { targetParent: 'Projects' },
        });

        const result = await renameFolderHandler(event);
        expect(result).toEqual({
          success: true,
          oldName: 'Code',
          newName: 'Projects/Code',
        });

        const folders = getAllFolders();
        expect(folders.some((f) => f.name === 'Projects/Code')).toBe(true);
      });

      it('moves subfolder to root via empty targetParent', async () => {
        createFolder('Projects/Frontend');
        const event = createMockEvent({
          params: { name: encodeURIComponent('Projects/Frontend') },
          body: { targetParent: '' },
        });

        const result = await renameFolderHandler(event);
        expect(result).toEqual({
          success: true,
          oldName: 'Projects/Frontend',
          newName: 'Frontend',
        });

        const folders = getAllFolders();
        expect(folders.some((f) => f.name === 'Frontend')).toBe(true);
      });

      it('throws 400 when neither newName nor targetParent is provided', async () => {
        const event = createMockEvent({
          params: { name: 'Guides' },
          body: {},
        });

        await expect(renameFolderHandler(event)).rejects.toMatchObject({
          statusCode: 400,
        });
      });

      it('throws 404 for non-existent folder', async () => {
        const event = createMockEvent({
          params: { name: 'NonExistent' },
          body: { newName: 'ValidName' },
        });

        await expect(renameFolderHandler(event)).rejects.toMatchObject({
          statusCode: 404,
        });
      });
    });

    describe('DELETE /api/folders/:name ([name].delete)', () => {
      it('deletes folder with URL-encoded subfolder path', async () => {
        createFolder('Work/Tasks/Q3');
        const event = createMockEvent({
          params: { name: encodeURIComponent('Work/Tasks/Q3') },
          query: { deleteNotes: 'false' },
        });

        const result = await deleteFolderHandler(event);
        expect(result).toEqual({
          success: true,
          name: 'Work/Tasks/Q3',
        });
      });

      it('deletes folder without deleting notes (deleteNotes=false)', async () => {
        const event = createMockEvent({
          params: { name: 'Guides' },
          query: { deleteNotes: 'false' },
        });

        const result = await deleteFolderHandler(event);
        expect(result).toEqual({
          success: true,
          name: 'Guides',
        });

        const folders = getAllFolders();
        expect(folders.some((f) => f.name === 'Guides')).toBe(false);

        const welcomeNote = getNoteById('seed-welcome-guide');
        expect(welcomeNote).not.toBeNull();
        expect(welcomeNote?.folder).toBeUndefined();
      });

      it('deletes folder and all notes inside when deleteNotes=true', async () => {
        const event = createMockEvent({
          params: { name: 'Projects' },
          query: { deleteNotes: 'true' },
        });

        const result = await deleteFolderHandler(event);
        expect(result).toEqual({
          success: true,
          name: 'Projects',
        });

        const roadmapNote = getNoteById('seed-project-roadmap');
        expect(roadmapNote).toBeNull();
      });

      it('throws 404 for deleting non-existent folder', async () => {
        const event = createMockEvent({
          params: { name: 'NonExistentFolder' },
        });

        await expect(deleteFolderHandler(event)).rejects.toMatchObject({
          statusCode: 404,
        });
      });
    });
  });
});
