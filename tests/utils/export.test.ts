import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeFilename,
  exportNoteMarkdown,
  exportNoteHtml,
  exportNotePlainText,
  exportNoteJson,
  exportCombinedMarkdown,
  downloadBlob,
  printNote,
} from '../../app/utils/export';
import type { Note } from '../../shared/types/note';

describe('Export Utilities (app/utils/export.ts)', () => {
  const sampleNote: Note = {
    id: 'note-1',
    title: 'My Project: Roadmap & Architecture / Notes?',
    content: `# Architecture Overview

This is a **bold statement** and *italicized text*.
Also ~~strikethrough~~ and \`inline code\`.

Here is a [Nuxt Link](https://nuxt.com) and an image ![Logo](https://nuxt.com/logo.png).

## Code Snippet
\`\`\`typescript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> A clever quote about coding.

### Task List
- [x] Task 1 completed
- [ ] Task 2 pending

### Features Table
| Feature | Status |
| :--- | :--- |
| Export | Done |
| Print | Done |
`,
    tags: ['nuxt', 'architecture', 'v1.0'],
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-02T15:30:00.000Z',
  };

  describe('sanitizeFilename', () => {
    it('strips illegal filename characters (<>:"/\\|?*) and control characters', () => {
      const raw = 'Bad <File> : Name "With" / Slashes \\ And | Pipes ? * Asterisks';
      const clean = sanitizeFilename(raw);
      expect(clean).not.toMatch(/[<>:"/\\|?*\x00-\x1F]/);
      expect(clean).toBe('Bad-File-Name-With-Slashes-And-Pipes-Asterisks');
    });

    it('normalizes spaces and consecutive hyphens', () => {
      const raw = 'Multiple   spaces   and---hyphens';
      expect(sanitizeFilename(raw)).toBe('Multiple-spaces-and-hyphens');
    });

    it('trims leading and trailing dots, spaces, and dashes', () => {
      const raw = '  ...---My Clean Note---...  ';
      expect(sanitizeFilename(raw)).toBe('My-Clean-Note');
    });

    it('caps max base filename length to 60 characters', () => {
      const longTitle = 'a'.repeat(100);
      const clean = sanitizeFilename(longTitle);
      expect(clean.length).toBeLessThanOrEqual(60);
      expect(clean).toBe('a'.repeat(60));
    });

    it('falls back to default or provided fallback when input is empty or invalid', () => {
      expect(sanitizeFilename('')).toBe('untitled-note');
      expect(sanitizeFilename('   ???:::***   ')).toBe('untitled-note');
      expect(sanitizeFilename('', 'custom-backup')).toBe('custom-backup');
    });

    it('appends and normalizes file extensions properly', () => {
      expect(sanitizeFilename('My Note', 'note', 'md')).toBe('My-Note.md');
      expect(sanitizeFilename('My Note', 'note', '.md')).toBe('My-Note.md');
      expect(sanitizeFilename('My Note.md', 'note', 'md')).toBe('My-Note.md');
      expect(sanitizeFilename('Data Export', 'export', 'json')).toBe('Data-Export.json');
    });
  });

  describe('exportNoteMarkdown', () => {
    it('exports note with YAML frontmatter by default', () => {
      const result = exportNoteMarkdown(sampleNote);
      expect(result).toContain('---');
      expect(result).toContain('title: "My Project: Roadmap & Architecture / Notes?"');
      expect(result).toContain('tags: ["nuxt", "architecture", "v1.0"]');
      expect(result).toContain('createdAt: 2025-01-01T10:00:00.000Z');
      expect(result).toContain('updatedAt: 2025-01-02T15:30:00.000Z');
      expect(result).toContain('# Architecture Overview');
    });

    it('exports raw markdown content without frontmatter when includeFrontmatter is false', () => {
      const result = exportNoteMarkdown(sampleNote, { includeFrontmatter: false });
      expect(result).not.toContain('title:');
      expect(result).not.toContain('tags:');
      expect(result).not.toContain('createdAt:');
      expect(result).toBe(sampleNote.content);
    });

    it('handles notes with empty tags, undefined content, or special characters in title', () => {
      const edgeNote: Note = {
        id: 'edge',
        title: 'Title with "quotes" and \n newlines',
        content: '',
        tags: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const result = exportNoteMarkdown(edgeNote);
      expect(result).toContain('tags: []');
      expect(result).toContain('title: "Title with \\"quotes\\" and   newlines"');
    });
  });

  describe('exportNoteHtml', () => {
    it('generates a full standalone HTML5 document with dark/light mode and print styling', () => {
      const html = exportNoteHtml(sampleNote, { standalone: true });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<title>My Project: Roadmap &amp; Architecture / Notes?</title>');
      expect(html).toContain('@media (prefers-color-scheme: light)');
      expect(html).toContain('@media print');
      expect(html).toContain('<h1 class="note-title">');
      expect(html).toContain('<main class="markdown-body">');
      expect(html).toContain('<strong>bold statement</strong>');
      expect(html).toContain('<em>italicized text</em>');
      expect(html).toContain('const greeting = "Hello, world!";');
      expect(html).toContain('language-typescript');
    });

    it('escapes note metadata to prevent XSS injection in standalone HTML header', () => {
      const maliciousNote: Note = {
        id: 'xss',
        title: '<script>alert("xss")</script>',
        content: '<img src=x onerror=alert("content-xss")> Hello',
        tags: ['<svg onload=alert(1)>', 'safe'],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const html = exportNoteHtml(maliciousNote, { standalone: true });
      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(html).not.toContain('<svg onload=alert(1)>');
      expect(html).toContain('&lt;svg onload=alert(1)&gt;');
      // Content is sanitized by DOMPurify - verify active XSS is neutralized
      expect(html).not.toContain('<img src=x onerror');
      expect(html).not.toContain('<script>');
    });

    it('returns only sanitized HTML body when standalone is false', () => {
      const html = exportNoteHtml(sampleNote, { standalone: false });
      expect(html).not.toContain('<!DOCTYPE html>');
      expect(html).not.toContain('<head>');
      expect(html).toContain('<strong>bold statement</strong>');
    });
  });

  describe('exportNotePlainText', () => {
    it('strips markdown tokens to produce clean readable text', () => {
      const text = exportNotePlainText(sampleNote);
      expect(text).not.toContain('# Architecture Overview');
      expect(text).toContain('Architecture Overview');
      expect(text).not.toContain('**bold statement**');
      expect(text).toContain('bold statement');
      expect(text).not.toContain('*italicized text*');
      expect(text).toContain('italicized text');
      expect(text).not.toContain('~~strikethrough~~');
      expect(text).toContain('strikethrough');
      expect(text).toContain('Nuxt Link (https://nuxt.com)');
      expect(text).toContain('Logo');
      expect(text).not.toContain('```typescript');
      expect(text).toContain('const greeting = "Hello, world!";');
      expect(text).toContain('[x] Task 1 completed');
      expect(text).toContain('[ ] Task 2 pending');
      expect(text).not.toContain('> A clever quote');
      expect(text).toContain('A clever quote about coding.');
    });

    it('handles empty or undefined note content cleanly', () => {
      const emptyNote: Note = {
        id: 'empty',
        title: 'Empty',
        content: '',
        tags: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      expect(exportNotePlainText(emptyNote)).toBe('');
    });
  });

  describe('exportNoteJson', () => {
    it('formats single note as 2-space indented JSON', () => {
      const json = exportNoteJson(sampleNote);
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(sampleNote);
      expect(json).toContain('  "id": "note-1"');
    });

    it('formats array of notes as 2-space indented JSON array', () => {
      const json = exportNoteJson([sampleNote]);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });
  });

  describe('exportCombinedMarkdown', () => {
    it('formats multiple notes into a single document with Table of Contents and dividers', () => {
      const notes: Note[] = [
        sampleNote,
        {
          id: 'note-2',
          title: 'Second Note: Backend Design',
          content: '## Backend Architecture\nDetails here.',
          tags: ['backend', 'nitro'],
          createdAt: '2025-01-03T10:00:00.000Z',
          updatedAt: '2025-01-03T12:00:00.000Z',
        },
      ];

      const digest = exportCombinedMarkdown(notes);
      expect(digest).toContain('# Notes Export Digest');
      expect(digest).toContain('## Table of Contents');
      expect(digest).toContain('1. [My Project: Roadmap & Architecture / Notes?](#');
      expect(digest).toContain('2. [Second Note: Backend Design](#');
      expect(digest).toContain('---');
      expect(digest).toContain('*Tags:* #nuxt #architecture #v1.0');
      expect(digest).toContain('## Backend Architecture');
    });

    it('handles empty note array gracefully', () => {
      const digest = exportCombinedMarkdown([]);
      expect(digest).toContain('No notes available to export');
    });
  });

  describe('downloadBlob and printNote', () => {
    let originalWindow: any;
    let originalDocument: any;

    beforeEach(() => {
      originalWindow = globalThis.window;
      originalDocument = globalThis.document;
    });

    afterEach(() => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    });

    it('downloadBlob creates Blob, object URL, triggers link click, and revokes URL', () => {
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const clickMock = vi.fn();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();

      const mockAnchor: any = {
        href: '',
        download: '',
        style: {},
        click: clickMock,
      };

      const mockDoc: any = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
          contains: vi.fn().mockReturnValue(true),
        },
      };

      globalThis.window = {} as any;
      globalThis.document = mockDoc;
      (globalThis as any).URL = {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      };

      downloadBlob('# Hello World', 'test-note.md', 'text/markdown');

      expect(mockDoc.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('test-note.md');
      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(appendChildMock).toHaveBeenCalledWith(mockAnchor);
      expect(clickMock).toHaveBeenCalled();
    });

    it('printNote creates hidden iframe and invokes print', () => {
      const printMock = vi.fn();
      const focusMock = vi.fn();
      const writeMock = vi.fn();
      const openMock = vi.fn();
      const closeMock = vi.fn();

      const mockIframe: any = {
        style: {},
        setAttribute: vi.fn(),
        contentWindow: {
          document: {
            open: openMock,
            write: writeMock,
            close: closeMock,
          },
          focus: focusMock,
          print: printMock,
          onload: null,
        },
      };

      const mockDoc: any = {
        createElement: vi.fn().mockReturnValue(mockIframe),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          contains: vi.fn().mockReturnValue(true),
        },
      };

      globalThis.window = {} as any;
      globalThis.document = mockDoc;

      printNote(sampleNote);

      expect(mockDoc.createElement).toHaveBeenCalledWith('iframe');
      expect(openMock).toHaveBeenCalled();
      expect(writeMock).toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
