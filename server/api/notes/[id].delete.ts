import { deleteNote } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Note ID parameter is required',
    });
  }

  const deleted = deleteNote(id);

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: `Note with id "${id}" not found`,
    });
  }

  return {
    success: true,
    id,
  };
});
