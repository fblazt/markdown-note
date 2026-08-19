import { getAllNotes } from '../../utils/db';

export default defineEventHandler(async (_event) => {
  return getAllNotes();
});
