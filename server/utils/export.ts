import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import type { Note } from '../../shared/types/note';

// Configure marked options for GitHub Flavored Markdown
marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Parses markdown to sanitized HTML on the server.
 */
export function parseMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ['form', 'iframe', 'object', 'embed', 'base', 'script', 'style', 'link'],
    ADD_ATTR: ['target', 'rel', 'class', 'type', 'checked', 'disabled'],
    ADD_TAGS: ['input'],
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes a title string to be used safely as a filename.
 * - Strips illegal characters: /[<>:"/\\|?*\x00-\x1F]/g -> '-'
 * - Normalizes whitespace and consecutive hyphens
 * - Trims leading and trailing dots, spaces, and dashes
 * - Caps max length at 60 characters
 * - Falls back to `fallback` if empty
 * - Ensures proper file extension if provided
 */
export function sanitizeFilename(
  title: string,
  fallback = 'untitled-note',
  extension?: string
): string {
  if (!title || typeof title !== 'string') {
    title = '';
  }

  // Strip illegal chars and control characters
  let clean = title
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[\s.-]+|[\s.-]+$/g, '');

  // Cap max base length to 60 characters
  if (clean.length > 60) {
    clean = clean.slice(0, 60).replace(/^[\s.-]+|[\s.-]+$/g, '');
  }

  // Fall back if empty
  if (!clean) {
    clean = fallback;
  }

  // Ensure file extension if specified
  if (extension) {
    const ext = extension.replace(/^\./, '').trim();
    if (ext) {
      const extSuffix = `.${ext.toLowerCase()}`;
      if (!clean.toLowerCase().endsWith(extSuffix)) {
        clean = `${clean}.${ext}`;
      }
    }
  }

  return clean;
}

/**
 * Exports a single note as Markdown text with optional YAML frontmatter.
 */
export function exportNoteMarkdown(
  note: Note,
  options: { includeFrontmatter?: boolean } = { includeFrontmatter: true }
): string {
  const includeFrontmatter = options?.includeFrontmatter !== false;
  if (!includeFrontmatter) {
    return note?.content ?? '';
  }

  const tags = Array.isArray(note?.tags) ? note.tags : [];
  const tagsYaml = tags.length > 0 ? `[${tags.map((t) => JSON.stringify(t)).join(', ')}]` : '[]';
  const safeTitle = (note?.title ?? 'Untitled Note').replace(/\n/g, ' ');

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(safeTitle)}`,
    `tags: ${tagsYaml}`,
    `createdAt: ${note?.createdAt || new Date().toISOString()}`,
    `updatedAt: ${note?.updatedAt || new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');

  return `${frontmatter}${note?.content ?? ''}`;
}

/**
 * Exports a note as an HTML string (standalone or body fragment) with Kanagawa Dragon / Lotus styling.
 */
export function exportNoteHtml(
  note: Note,
  options: { standalone?: boolean } = { standalone: true }
): string {
  const standalone = options?.standalone !== false;
  const parsedContent = parseMarkdown(note?.content ?? '');

  if (!standalone) {
    return parsedContent;
  }

  const title = escapeHtml(note?.title || 'Untitled Note');
  const updatedAt = note?.updatedAt ? new Date(note.updatedAt).toLocaleString() : '';
  const tags = Array.isArray(note?.tags) ? note.tags : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      /* Kanagawa Dragon (Dark) */
      --bg-primary: #181616;
      --bg-surface: #1d1c19;
      --text-primary: #c5c9c5;
      --text-secondary: #8a9a86;
      --text-muted: #625e5a;
      --accent-primary: #8ba4b0;
      --border-color: #282727;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-mono: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    @media (prefers-color-scheme: light) {
      :root {
        /* Kanagawa Lotus (Light) */
        --bg-primary: #f2ecbc;
        --bg-surface: #e7d7ad;
        --text-primary: #43436c;
        --text-secondary: #716e61;
        --text-muted: #8a8980;
        --accent-primary: #4d699b;
        --border-color: #dcd5ac;
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: var(--font-sans);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.65;
      padding: 2.5rem 1.5rem;
      max-width: 860px;
      margin: 0 auto;
      font-size: 15px;
    }
    .note-header {
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
    }
    .note-title {
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.25;
      margin-bottom: 0.75rem;
    }
    .note-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .note-date {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .note-tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .note-tag {
      background: var(--bg-surface);
      color: var(--accent-primary);
      border: 1px solid var(--border-color);
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .markdown-body {
      word-break: break-word;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      color: var(--text-primary);
      font-weight: 600;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    .markdown-body h1 { font-size: 1.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem; }
    .markdown-body h2 { font-size: 1.4rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem; }
    .markdown-body h3 { font-size: 1.18rem; }
    .markdown-body p { margin-bottom: 1rem; }
    .markdown-body p:last-child { margin-bottom: 0; }
    .markdown-body a { color: var(--accent-primary); text-decoration: underline; text-underline-offset: 3px; }
    .markdown-body code {
      font-family: var(--font-mono);
      background-color: var(--bg-surface);
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-size: 0.88em;
    }
    .markdown-body pre {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 1.25rem 0;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .markdown-body pre code { background: transparent; padding: 0; border: 0; }
    .markdown-body blockquote {
      border-left: 4px solid var(--accent-primary);
      margin: 1.25rem 0;
      padding: 0.75rem 1rem;
      background-color: var(--bg-surface);
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: var(--text-secondary);
    }
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
    }
    .markdown-body th, .markdown-body td {
      border: 1px solid var(--border-color);
      padding: 0.65rem 0.9rem;
      text-align: left;
    }
    .markdown-body th { background-color: var(--bg-surface); font-weight: 600; }
    .markdown-body img { max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0; }
    .markdown-body ul, .markdown-body ol { margin: 0.75rem 0 1rem 1.5rem; }
    .markdown-body li { margin-bottom: 0.35rem; }
    .markdown-body hr { border: 0; border-top: 1px solid var(--border-color); margin: 2rem 0; }
    .markdown-body ul:has(input[type="checkbox"]) { list-style: none; padding-left: 0.25rem; margin-left: 0; }
    .markdown-body li:has(input[type="checkbox"]) { display: flex; align-items: baseline; gap: 0.5rem; }
    
    @media print {
      body {
        background-color: #ffffff !important;
        color: #111827 !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .note-header { border-bottom: 2px solid #111827 !important; }
      .note-title { color: #111827 !important; }
      .note-meta { color: #4b5563 !important; }
      .note-tag {
        border: 1px solid #d1d5db !important;
        background-color: #f3f4f6 !important;
        color: #111827 !important;
      }
      .markdown-body pre, .markdown-body blockquote, .markdown-body th {
        background-color: #f9fafb !important;
        border-color: #e5e7eb !important;
      }
      .markdown-body a { color: #111827 !important; text-decoration: underline !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <header class="note-header">
    <h1 class="note-title">${title}</h1>
    <div class="note-meta">
      ${updatedAt ? `<span class="note-date">Updated: ${escapeHtml(updatedAt)}</span>` : ''}
      ${tags.length > 0 ? `<div class="note-tags">${tags.map((t) => `<span class="note-tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    </div>
  </header>
  <main class="markdown-body">
    ${parsedContent}
  </main>
</body>
</html>`;
}

/**
 * Strips markdown formatting to produce clean, readable plain text.
 */
export function exportNotePlainText(note: Note): string {
  const content = note?.content ?? '';

  let text = content
    .replace(/```[\w-]*\n([\s\S]*?)\n```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^#{1,6}\s+(.*)$/gm, '$1')
    .replace(/^>\s?(.*)$/gm, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^(\s*)[*+-]\s+\[([ xX])\]\s+/gm, '$1[$2] ')
    .replace(/^(\s*)[*+-]\s+/gm, '$1- ')
    .replace(/^\s*\|?[\s\-:|]+\|\s*$/gm, '')
    .replace(/^\s*\|\s*(.*?)\s*\|\s*$/gm, '$1')
    .replace(/\s*\|\s*/g, '  |  ')
    .replace(/^(\s*[-*_]){3,}\s*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Exports note(s) as formatted JSON.
 */
export function exportNoteJson(note: Note | Note[]): string {
  return JSON.stringify(note, null, 2);
}

/**
 * Combines multiple notes into a single Markdown document with a Table of Contents.
 */
export function exportCombinedMarkdown(notes: Note[]): string {
  if (!Array.isArray(notes) || notes.length === 0) {
    return '# Notes Export Digest\n\nNo notes available to export.\n';
  }

  const tocEntries: string[] = [];
  const noteSections: string[] = [];

  notes.forEach((note, index) => {
    const title = note.title?.trim() || `Untitled Note ${index + 1}`;
    const slug = sanitizeFilename(title, `note-${index + 1}`).toLowerCase();
    tocEntries.push(`${index + 1}. [${title}](#${slug})`);

    const tags = Array.isArray(note.tags) && note.tags.length > 0
      ? `*Tags:* ${note.tags.map((t) => `#${t}`).join(' ')}  \n`
      : '';
    const date = note.updatedAt ? `*Last Updated:* ${new Date(note.updatedAt).toLocaleString()}  \n` : '';

    const metaBlock = tags || date ? `${tags}${date}\n` : '';

    noteSections.push(
      `## <a id="${slug}"></a>${title}\n\n${metaBlock}${note.content ?? ''}`
    );
  });

  const header = [
    '# Notes Export Digest',
    '',
    `*Generated on:* ${new Date().toISOString()}`,
    `*Total Notes:* ${notes.length}`,
    '',
    '## Table of Contents',
    '',
    tocEntries.join('\n'),
    '',
    '---',
    '',
  ].join('\n');

  return `${header}${noteSections.join('\n\n---\n\n')}\n`;
}
