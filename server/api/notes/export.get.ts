import { getAllNotes } from '../../utils/db';
import { exportNoteJson, exportCombinedMarkdown } from '../../utils/export';

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as { format?: string };
  const format = (query?.format || 'json').toLowerCase();
  const notes = getAllNotes();

  if (format === 'markdown' || format === 'md') {
    const filename = 'notes-export.md';
    setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8');
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
    return exportCombinedMarkdown(notes);
  }

  // Default to JSON backup
  const filename = 'notes-backup.json';
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8');
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
  return exportNoteJson(notes);
});
