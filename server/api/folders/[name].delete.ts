import { deleteFolder } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name');

  if (!rawName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder name parameter is required',
    });
  }

  const name = decodeURIComponent(rawName).trim();
  const query = getQuery(event);

  let deleteNotes = query.deleteNotes === 'true' || query.deleteNotes === true;

  try {
    const body = await readBody<{ deleteNotes?: boolean }>(event);
    if (body && typeof body.deleteNotes === 'boolean') {
      deleteNotes = body.deleteNotes;
    }
  } catch {
    // Body is optional on DELETE requests
  }

  const deleted = deleteFolder(name, deleteNotes);

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: `Folder "${name}" not found`,
    });
  }

  return {
    success: true,
    name,
  };
});
