import { renameFolder, moveFolder, normalizeFolderPath } from '../../utils/db';
import type { RenameFolderDTO } from '../../../shared/types/note';

export default defineEventHandler(async (event) => {
  const rawName = getRouterParam(event, 'name');

  if (!rawName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder name parameter is required',
    });
  }

  const oldName = decodeURIComponent(rawName).trim();
  const body = await readBody<RenameFolderDTO>(event);

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request body is required',
    });
  }

  // Handle move if targetParent is provided (including empty string to move to root)
  if (typeof body.targetParent === 'string') {
    const targetParent = normalizeFolderPath(body.targetParent);
    const moved = moveFolder(oldName, targetParent || undefined);

    if (!moved) {
      throw createError({
        statusCode: 404,
        statusMessage: `Folder "${oldName}" could not be moved to "${targetParent}"`,
      });
    }

    const baseName = oldName.split('/').pop()!;
    const newName = targetParent ? `${targetParent}/${baseName}` : baseName;

    return {
      success: true,
      oldName,
      newName,
    };
  }

  // Handle rename
  if (typeof body.newName === 'string' && body.newName.trim().length > 0) {
    const newName = normalizeFolderPath(body.newName);
    const renamed = renameFolder(oldName, newName);

    if (!renamed) {
      throw createError({
        statusCode: 404,
        statusMessage: `Folder "${oldName}" not found or rename failed`,
      });
    }

    return {
      success: true,
      oldName,
      newName,
    };
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Either newName or targetParent must be provided',
  });
});
