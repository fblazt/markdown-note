import { updateNote } from '../../utils/db';
import type { UpdateNoteDTO } from '../../../shared/types/note';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Note ID parameter is required',
    });
  }

  const body = await readBody<UpdateNoteDTO>(event);

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body must be a valid JSON object',
    });
  }

  const updatedNote = updateNote(id, {
    title: body.title,
    content: body.content,
    tags: body.tags,
    folder: body.folder,
  });

  if (!updatedNote) {
    throw createError({
      statusCode: 404,
      statusMessage: `Note with id "${id}" not found`,
    });
  }

  return updatedNote;
});
