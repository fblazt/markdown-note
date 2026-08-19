import { getNoteById } from '../../utils/db';

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

  return note;
});
