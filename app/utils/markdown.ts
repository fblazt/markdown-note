import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Configure marked options for GitHub Flavored Markdown
marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Parses markdown text and returns sanitized HTML string.
 * Strictly prevents XSS by filtering malicious tags, attributes, and URI schemes.
 */
export function parseMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Parse markdown to HTML synchronously
  const rawHtml = marked.parse(content, { async: false }) as string;

  // Sanitize HTML with DOMPurify
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ['form', 'iframe', 'object', 'embed', 'base', 'script', 'style', 'link'],
    ADD_ATTR: ['target', 'rel', 'class', 'type', 'checked', 'disabled'],
    ADD_TAGS: ['input'],
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
