import { ref } from 'vue';
import type { Note } from '../../shared/types/note';

export type DraggedItem =
  | { type: 'note'; noteId: string; sourceFolder?: string }
  | { type: 'folder'; path: string }
  | null;

// Singleton refs for drag-and-drop orchestration across tree items
const draggedItem = ref<DraggedItem>(null);
const currentDropTarget = ref<string | null>(null);
const isDragging = ref(false);

export function useDragAndDrop() {
  function handleDragStartNote(e: DragEvent, note: Pick<Note, 'id' | 'folder'>): void {
    isDragging.value = true;
    draggedItem.value = { type: 'note', noteId: note.id, sourceFolder: note.folder };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: 'note',
          noteId: note.id,
          sourceFolder: note.folder,
        })
      );
      e.dataTransfer.setData('text/plain', note.id);
    }
  }

  function handleDragStartFolder(e: DragEvent, folderPath: string): void {
    isDragging.value = true;
    draggedItem.value = { type: 'folder', path: folderPath };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: 'folder',
          folderPath,
        })
      );
      e.dataTransfer.setData('text/plain', folderPath);
    }
  }

  function handleDragEnd(): void {
    isDragging.value = false;
    draggedItem.value = null;
    currentDropTarget.value = null;
  }

  function handleDragEnter(targetPath: string): void {
    if (draggedItem.value?.type === 'folder') {
      if (targetPath === draggedItem.value.path || targetPath.startsWith(draggedItem.value.path + '/')) {
        return;
      }
    }
    currentDropTarget.value = targetPath;
  }

  function handleDragLeave(targetPath: string): void {
    if (currentDropTarget.value === targetPath) {
      currentDropTarget.value = null;
    }
  }

  return {
    draggedItem,
    currentDropTarget,
    isDragging,
    handleDragStartNote,
    handleDragStartFolder,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
  };
}
