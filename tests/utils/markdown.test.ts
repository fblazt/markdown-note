import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  escapeHtml,
  getWordCount,
  getCharCount,
  getReadingTime,
} from '../../app/utils/markdown';

describe('Markdown Parser & Sanitizer: app/utils/markdown.ts', () => {
  describe('Standard Markdown & GFM Parsing', () => {
    it('renders headings correctly', () => {
      const input = '# Heading 1\n## Heading 2\n### Heading 3';
      const html = parseMarkdown(input);
      expect(html).toContain('<h1');
      expect(html).toContain('Heading 1</h1>');
      expect(html).toContain('<h2');
      expect(html).toContain('Heading 2</h2>');
      expect(html).toContain('<h3');
      expect(html).toContain('Heading 3</h3>');
    });

    it('renders typography (bold, italic, strikethrough)', () => {
      const input = '**bold text** and *italic text* and ~~strike text~~';
      const html = parseMarkdown(input);
      expect(html).toContain('<strong>bold text</strong>');
      expect(html).toContain('<em>italic text</em>');
      expect(html).toContain('<del>strike text</del>');
    });

    it('renders blockquotes and lists', () => {
      const input = '> A wise quote\n\n* Item A\n* Item B';
      const html = parseMarkdown(input);
      expect(html).toContain('<blockquote>');
      expect(html).toContain('A wise quote');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Item A</li>');
      expect(html).toContain('<li>Item B</li>');
    });

    it('renders GFM task lists', () => {
      const input = '- [x] Completed task\n- [ ] Pending task';
      const html = parseMarkdown(input);
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('checked');
      expect(html).toContain('Completed task');
      expect(html).toContain('Pending task');
    });

    it('renders regular code blocks and inline code', () => {
      const input = '`inline code`\n\n```typescript\nconst x = 42;\n```';
      const html = parseMarkdown(input);
      expect(html).toContain('<code>inline code</code>');
      expect(html).toContain('<pre>');
      expect(html).toContain('const x = 42;');
      expect(html).not.toContain('class="mermaid-diagram"');
    });

    it('renders GFM tables', () => {
      const input = `
| Header 1 | Header 2 |
| :--- | :--- |
| Val 1 | Val 2 |
`;
      const html = parseMarkdown(input);
      expect(html).toContain('<table>');
      expect(html).toContain('Header 1');
      expect(html).toContain('Val 1');
      expect(html).toContain('Val 2');
    });

    it('handles empty or non-string input safely', () => {
      expect(parseMarkdown('')).toBe('');
      // @ts-expect-error test non-string input
      expect(parseMarkdown(null)).toBe('');
      // @ts-expect-error test non-string input
      expect(parseMarkdown(undefined)).toBe('');
    });
  });

  describe('Mermaid & Flowchart Code Block Parsing', () => {
    it('renders mermaid code block with data-mermaid and fallback', () => {
      const mermaidCode = 'graph TD;\n  A-->B;\n  B-->C;';
      const input = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
      const html = parseMarkdown(input);

      expect(html).toContain('class="mermaid-diagram"');
      expect(html).toContain(`data-mermaid="${encodeURIComponent(mermaidCode)}"`);
      expect(html).toContain('class="mermaid-fallback"');
      expect(html).toContain('A--&gt;B;');
    });

    it('renders flowchart code block with data-mermaid and fallback', () => {
      const flowchartCode = 'flowchart LR\n  Start --> Stop';
      const input = `\`\`\`flowchart\n${flowchartCode}\n\`\`\``;
      const html = parseMarkdown(input);

      expect(html).toContain('class="mermaid-diagram"');
      expect(html).toContain(`data-mermaid="${encodeURIComponent(flowchartCode)}"`);
      expect(html).toContain('class="mermaid-fallback"');
      expect(html).toContain('Start --&gt; Stop');
    });

    it('handles case-insensitive mermaid language identifiers', () => {
      const code = 'graph LR\n  X --> Y';
      const input = `\`\`\`MERMAID\n${code}\n\`\`\``;
      const html = parseMarkdown(input);

      expect(html).toContain('class="mermaid-diagram"');
      expect(html).toContain(`data-mermaid="${encodeURIComponent(code)}"`);
    });
  });

  describe('Security & XSS Prevention', () => {
    it('strips <script> tags completely', () => {
      const malicious = 'Hello <script>alert("XSS Attack!");</script> World';
      const html = parseMarkdown(malicious);
      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(');
      expect(html).toContain('Hello');
      expect(html).toContain('World');
    });

    it('strips onerror and onclick event handlers from images/elements', () => {
      const malicious = '<img src="invalid-img.jpg" onerror="alert(1)" />\n<div onclick="evil()">Click me</div>';
      const html = parseMarkdown(malicious);
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('onclick');
      expect(html).not.toContain('alert(1)');
      expect(html).not.toContain('evil()');
    });

    it('sanitizes javascript: pseudo-protocol URIs in links', () => {
      const malicious = '[Click here to hack](javascript:alert(document.cookie))';
      const html = parseMarkdown(malicious);
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('document.cookie');
    });

    it('removes unsafe tags (iframe, object, embed, form)', () => {
      const malicious = '<iframe src="https://attacker.com"></iframe><embed src="malware.swf"><form action="/steal"></form>';
      const html = parseMarkdown(malicious);
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('<embed');
      expect(html).not.toContain('<form');
    });

    it('retains valid SVG elements and attributes', () => {
      const svgContent = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /><text x="50" y="50">Label</text></svg>';
      const html = parseMarkdown(svgContent);
      expect(html).toContain('<svg');
      expect(html).toContain('<circle');
      expect(html).toContain('<text');
    });
  });

  describe('HTML Escaping: escapeHtml', () => {
    it('escapes special characters correctly', () => {
      expect(escapeHtml('<script>alert("XSS" & \'test\')</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot; &amp; &#39;test&#39;)&lt;/script&gt;'
      );
    });

    it('handles empty or non-string input safely', () => {
      expect(escapeHtml('')).toBe('');
      // @ts-expect-error test non-string input
      expect(escapeHtml(null)).toBe('');
      // @ts-expect-error test non-string input
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('Statistics Helpers', () => {
    it('getWordCount correctly calculates words', () => {
      expect(getWordCount('')).toBe(0);
      expect(getWordCount('    ')).toBe(0);
      expect(getWordCount('One two three')).toBe(3);
      expect(getWordCount('One\n\ntwo\t\tthree   four')).toBe(4);
    });

    it('getCharCount calculates character count', () => {
      expect(getCharCount('')).toBe(0);
      expect(getCharCount('hello')).toBe(5);
      expect(getCharCount('hello world')).toBe(11);
    });

    it('getReadingTime estimates reading duration', () => {
      expect(getReadingTime('')).toBe(0);
      expect(getReadingTime('A quick brown fox')).toBe(1);
      const manyWords = Array(450).fill('word').join(' ');
      expect(getReadingTime(manyWords)).toBe(3);
    });
  });
});
