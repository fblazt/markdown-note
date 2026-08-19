import { getAllFolders } from '../../utils/db';

export default defineEventHandler(() => {
  return getAllFolders();
});
