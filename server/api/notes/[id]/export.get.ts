import { getNoteById } from '../../../utils/db';
import {
  sanitizeFilename,
  exportNoteMarkdown,
  exportNoteHtml,
  exportNotePlainText,
  exportNoteJson,
} from '../../../utils/export';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Note ID parameter is required',
    });
  }

  const note = getNoteById(id);

  if (!note) {
    throw createError({
      statusCode: 404,
      statusMessage: `Note with id "${id}" not found`,
    });
  }

  const query = getQuery(event) as { format?: string };
  const format = (query?.format || 'md').toLowerCase();

  switch (format) {
    case 'html': {
      const filename = sanitizeFilename(note.title, 'note', 'html');
      setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8');
      setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
      return exportNoteHtml(note, { standalone: true });
    }
    case 'txt':
    case 'text': {
      const filename = sanitizeFilename(note.title, 'note', 'txt');
      setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
      setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
      return exportNotePlainText(note);
    }
    case 'json': {
      const filename = sanitizeFilename(note.title, 'note', 'json');
      setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8');
      setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
      return exportNoteJson(note);
    }
    case 'md':
    case 'markdown':
    default: {
      const filename = sanitizeFilename(note.title, 'note', 'md');
      setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8');
      setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
      return exportNoteMarkdown(note);
    }
  }
});
