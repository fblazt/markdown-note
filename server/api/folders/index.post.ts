import { createFolder, normalizeFolderPath } from '../../utils/db';
import type { CreateFolderDTO } from '../../../shared/types/note';

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateFolderDTO>(event);

  if (!body || typeof body !== 'object' || typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder name is required and must be a non-empty string',
    });
  }

  const normalized = normalizeFolderPath(body.name);
  if (!normalized) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder name is required and must be a non-empty string',
    });
  }

  const created = createFolder(normalized);

  if (!created) {
    throw createError({
      statusCode: 409,
      statusMessage: `Folder "${normalized}" already exists`,
    });
  }

  setResponseStatus(event, 201);
  return {
    success: true,
    name: normalized,
  };
});
