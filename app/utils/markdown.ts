import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Escapes special HTML characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Configure marked options for GitHub Flavored Markdown with Mermaid renderer
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const cleanLang = (lang || '').trim().toLowerCase();
      if (cleanLang === 'mermaid' || cleanLang === 'flowchart') {
        const encoded = encodeURIComponent(text);
        return `<div class="mermaid-diagram" data-mermaid="${encoded}"><pre class="mermaid-fallback"><code>${escapeHtml(text)}</code></pre></div>`;
      }
      return false;
    },
  },
});

/**
 * Parses markdown text and returns sanitized HTML string.
 * Strictly prevents XSS by filtering malicious tags, attributes, and URI schemes
 * while permitting SVG and Mermaid diagram attributes.
 */
export function parseMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Parse markdown to HTML synchronously
  const rawHtml = marked.parse(content, { async: false }) as string;

  // Sanitize HTML with DOMPurify
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ['form', 'iframe', 'object', 'embed', 'base', 'script', 'link'],
    ADD_ATTR: ['target', 'rel', 'class', 'type', 'checked', 'disabled', 'data-mermaid'],
    ADD_TAGS: [
      'input',
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'text',
      'line',
      'polygon',
      'polyline',
      'marker',
      'defs',
      'use',
      'foreignobject',
      'style',
    ],
  });

  return cleanHtml;
}

/**
 * Calculates word count for a text content.
 */
export function getWordCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates character count for a text content (excluding extra whitespace).
 */
export function getCharCount(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return text.length;
}

/**
 * Estimates reading time in minutes (assuming 200 words per minute).
 */
export function getReadingTime(text: string): number {
  const words = getWordCount(text);
  if (words === 0) return 0;
  return Math.ceil(words / 200);
}
