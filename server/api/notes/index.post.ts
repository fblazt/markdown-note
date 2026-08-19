import { createNote } from '../../utils/db';
import type { CreateNoteDTO } from '../../../shared/types/note';

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateNoteDTO>(event);

  if (!body || typeof body !== 'object' || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required and must be a non-empty string',
    });
  }

  const newNote = createNote({
    title: body.title,
    content: body.content ?? '',
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  setResponseStatus(event, 201);
  return newNote;
});
