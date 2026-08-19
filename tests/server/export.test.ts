import { describe, it, expect, beforeEach } from 'vitest';
import bulkExportHandler from '../../server/api/notes/export.get';
import singleExportHandler from '../../server/api/notes/[id]/export.get';
import { resetDb, getAllNotes } from '../../server/utils/db';

function createMockEvent(options: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
} = {}): any {
  const headers: Record<string, string> = {};
  return {
    context: {
      params: options.params || {},
    },
    query: options.query || {},
    node: {
      req: {
        body: options.body,
        url: options.query
          ? `http://localhost?${new URLSearchParams(options.query).toString()}`
          : 'http://localhost',
      },
      res: {
        statusCode: 200,
        headers,
        setHeader: (name: string, value: string) => {
          headers[name.toLowerCase()] = value;
        },
        getHeader: (name: string) => {
          return headers[name.toLowerCase()];
        },
      },
    },
    _body: options.body,
  };
}

function getHeader(event: any, name: string): string | undefined {
  return (globalThis as any).getResponseHeader(event, name) || event.node?.res?.headers?.[name.toLowerCase()];
}

describe('Nitro API Handlers: Export Endpoints', () => {
  beforeEach(() => {
    resetDb();
  });

  describe('GET /api/notes/export (bulk export)', () => {
    it('defaults to JSON backup format with attachment header and valid JSON array', async () => {
      const event = createMockEvent();
      const result = await bulkExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('application/json; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toBe('attachment; filename="notes-backup.json"');

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThanOrEqual(3);

      const allNotes = getAllNotes();
      expect(parsed.length).toBe(allNotes.length);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('title');
      expect(parsed[0]).toHaveProperty('content');
      expect(parsed[0]).toHaveProperty('tags');
    });

    it('returns JSON backup when format=json is specified', async () => {
      const event = createMockEvent({
        query: { format: 'json' },
      });
      const result = await bulkExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('application/json; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toBe('attachment; filename="notes-backup.json"');

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.some((n: any) => n.id === 'seed-welcome-guide')).toBe(true);
    });

    it('returns combined markdown document with TOC when format=markdown', async () => {
      const event = createMockEvent({
        query: { format: 'markdown' },
      });
      const result = await bulkExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toBe('attachment; filename="notes-export.md"');

      expect(typeof result).toBe('string');
      expect(result).toContain('# Notes Export Digest');
      expect(result).toContain('## Table of Contents');
      expect(result).toContain('*Total Notes:*');
      expect(result).toContain('Welcome to Markdown Notes');
      expect(result).toContain('---');
    });

    it('returns combined markdown document with TOC when format=md (case-insensitive)', async () => {
      const event = createMockEvent({
        query: { format: 'MD' },
      });
      const result = await bulkExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toBe('attachment; filename="notes-export.md"');

      expect(typeof result).toBe('string');
      expect(result).toContain('# Notes Export Digest');
      expect(result).toContain('## Table of Contents');
      expect(result).toContain('1. [');
    });
  });

  describe('GET /api/notes/:id/export (single note export)', () => {
    const validId = 'seed-welcome-guide';

    it('defaults to markdown format with YAML frontmatter and attachment header', async () => {
      const event = createMockEvent({
        params: { id: validId },
      });
      const result = await singleExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.md"$/);

      expect(typeof result).toBe('string');
      expect(result).toContain('---');
      expect(result).toContain('title:');
      expect(result).toContain('tags:');
      expect(result).toContain('# Welcome to Markdown Notes');
    });

    it('returns markdown format when format=md / format=markdown is specified', async () => {
      const eventMd = createMockEvent({
        params: { id: validId },
        query: { format: 'md' },
      });
      const resultMd = await singleExportHandler(eventMd);

      expect(getHeader(eventMd, 'Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(getHeader(eventMd, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.md"$/);
      expect(resultMd).toContain('---');

      const eventMarkdown = createMockEvent({
        params: { id: validId },
        query: { format: 'markdown' },
      });
      const resultMarkdown = await singleExportHandler(eventMarkdown);
      expect(getHeader(eventMarkdown, 'Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(resultMarkdown).toContain('---');
    });

    it('returns standalone HTML document when format=html', async () => {
      const event = createMockEvent({
        params: { id: validId },
        query: { format: 'html' },
      });
      const result = await singleExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('text/html; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.html"$/);

      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<head>');
      expect(result).toContain('<title>');
      expect(result).toContain('<main class="markdown-body">');
      expect(result).toContain('Welcome to Markdown Notes');
      expect(result).toContain('</html>');
    });

    it('returns plain text with stripped markdown when format=txt / format=text', async () => {
      const event = createMockEvent({
        params: { id: validId },
        query: { format: 'txt' },
      });
      const result = await singleExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('text/plain; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.txt"$/);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('---');
      expect(result).not.toContain('```typescript');
      expect(result).not.toContain('**Nuxt 3**');
      expect(result).toContain('Nuxt 3');
      expect(result).toContain('Welcome to Markdown Notes');

      // Test format=text alias
      const eventText = createMockEvent({
        params: { id: validId },
        query: { format: 'text' },
      });
      const resultText = await singleExportHandler(eventText);
      expect(getHeader(eventText, 'Content-Type')).toBe('text/plain; charset=utf-8');
      expect(getHeader(eventText, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.txt"$/);
      expect(typeof resultText).toBe('string');
    });

    it('returns JSON data when format=json', async () => {
      const event = createMockEvent({
        params: { id: validId },
        query: { format: 'json' },
      });
      const result = await singleExportHandler(event);

      expect(getHeader(event, 'Content-Type')).toBe('application/json; charset=utf-8');
      expect(getHeader(event, 'Content-Disposition')).toMatch(/^attachment; filename=".*\.json"$/);

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('id', validId);
      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('content');
      expect(parsed).toHaveProperty('tags');
    });

    it('throws 404 for unknown note ID', async () => {
      const event = createMockEvent({
        params: { id: 'unknown-note-id-404' },
      });

      await expect(singleExportHandler(event)).rejects.toMatchObject({
        statusCode: 404,
        statusMessage: 'Note with id "unknown-note-id-404" not found',
      });
    });

    it('throws 400 if ID parameter is missing', async () => {
      const event = createMockEvent({
        params: {},
      });

      await expect(singleExportHandler(event)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Note ID parameter is required',
      });
    });
  });
});
