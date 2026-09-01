<script setup lang="ts">
import {
  Plus,
  FolderPlus,
  Check,
  X,
  Folder,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-vue-next';

const {
  notes,
  folderTree,
  rootNotes,
  expandedFolders,
  selectedFolder,
  selectedNoteId,
  searchQuery,
  selectedTag,
  filteredNotes,
  isLoading,
  isSidebarOpen,
  openNote,
  createNote,
  deleteNote,
  createFolder,
  createSubfolder,
  renameFolder,
  moveFolder,
  moveNoteToFolder,
  deleteFolder,
  toggleFolder,
} = useNotes();

const { confirm } = useConfirm();

const {
  draggedItem,
  currentDropTarget,
  handleDragStartNote,
  handleDragStartFolder,
  handleDragEnd,
  handleDragEnter: handleFolderDragEnter,
  handleDragLeave: handleFolderDragLeave,
} = useDragAndDrop();

// Folder creation inline state
const isCreatingFolder = ref(false);
const newFolderName = ref('');
const createFolderInputRef = ref<HTMLInputElement | null>(null);

// Subfolder creation inline state
const creatingSubfolderParent = ref<string | null>(null);

// Folder rename inline state
const renamingFolderPath = ref<string | null>(null);

function isFolderExpanded(folderName: string): boolean {
  if (folderName === '__uncategorized__') {
    return expandedFolders.value.includes('__uncategorized__') || expandedFolders.value.includes('Uncategorized');
  }
  return expandedFolders.value.includes(folderName);
}

function handleFolderClick(folderName: string) {
  if (folderName === '__uncategorized__') {
    selectedFolder.value = selectedFolder.value === '__root__' ? null : '__root__';
    toggleFolder('__uncategorized__');
  } else {
    toggleFolder(folderName);
  }
}

function startCreateFolder() {
  isCreatingFolder.value = true;
  newFolderName.value = '';
  nextTick(() => {
    createFolderInputRef.value?.focus();
  });
}

function cancelCreateFolder() {
  isCreatingFolder.value = false;
  newFolderName.value = '';
}

async function submitCreateFolder() {
  const trimmed = newFolderName.value.trim();
  if (trimmed) {
    await createFolder(trimmed);
  }
  isCreatingFolder.value = false;
  newFolderName.value = '';
}

function startCreateSubfolder(parentPath: string) {
  creatingSubfolderParent.value = parentPath;
}

async function submitCreateSubfolder(parentPath: string, subfolderName: string) {
  const trimmed = subfolderName.trim();
  if (trimmed) {
    await createSubfolder(parentPath, trimmed);
  }
  creatingSubfolderParent.value = null;
}

function cancelCreateSubfolder() {
  creatingSubfolderParent.value = null;
}

function startRenameFolder(path: string, _currentName: string) {
  renamingFolderPath.value = path;
}

function cancelRenameFolder() {
  renamingFolderPath.value = null;
}

async function submitRenameFolder(oldPath: string, newName: string) {
  const trimmed = newName.trim();
  if (trimmed) {
    const lastSlash = oldPath.lastIndexOf('/');
    const parentPath = lastSlash !== -1 ? oldPath.substring(0, lastSlash) : '';
    let newFullPath = trimmed;
    if (trimmed.includes('/')) {
      newFullPath = trimmed;
    } else if (parentPath) {
      newFullPath = `${parentPath}/${trimmed}`;
    }
    if (oldPath !== newFullPath) {
      await renameFolder(oldPath, newFullPath);
    }
  }
  renamingFolderPath.value = null;
}

async function handleDeleteFolder(folderName: string) {
  const confirmed = await confirm({
    title: 'Delete Folder',
    message: `Are you sure you want to delete folder "${folderName}" and all its subfolders? Notes inside will become uncategorized.`,
    itemTitle: folderName,
    variant: 'danger',
    confirmText: 'Delete Folder',
    cancelText: 'Cancel',
  });

  if (confirmed) {
    await deleteFolder(folderName, false);
  }
}

async function handleFolderDrop(targetFolderPath: string) {
  const data = draggedItem.value;
  handleDragEnd();
  if (!data) return;

  if (data.type === 'note' && data.noteId) {
    await moveNoteToFolder(data.noteId, targetFolderPath);
  } else if (data.type === 'folder' && data.path) {
    if (data.path !== targetFolderPath && !targetFolderPath.startsWith(data.path + '/')) {
      await moveFolder(data.path, targetFolderPath);
    }
  }
}

function handleAllNotesDragEnter() {
  currentDropTarget.value = '__all__';
}

function handleAllNotesDragLeave() {
  if (currentDropTarget.value === '__all__') {
    currentDropTarget.value = null;
  }
}

async function handleAllNotesDrop() {
  const data = draggedItem.value;
  handleDragEnd();
  if (!data) return;

  if (data.type === 'note' && data.noteId) {
    await moveNoteToFolder(data.noteId, '');
  } else if (data.type === 'folder' && data.path) {
    await moveFolder(data.path, '');
  }
}

function handleUncategorizedDragEnter() {
  currentDropTarget.value = '__uncategorized__';
}

function handleUncategorizedDragLeave() {
  if (currentDropTarget.value === '__uncategorized__') {
    currentDropTarget.value = null;
  }
}

async function handleUncategorizedDrop() {
  const data = draggedItem.value;
  handleDragEnd();
  if (!data) return;

  if (data.type === 'note' && data.noteId) {
    await moveNoteToFolder(data.noteId, '');
  } else if (data.type === 'folder' && data.path) {
    await moveFolder(data.path, '');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isCreatingFolder.value) cancelCreateFolder();
    if (creatingSubfolderParent.value) cancelCreateSubfolder();
    if (renamingFolderPath.value) cancelRenameFolder();
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeydown);
  }
  // Ensure default folders expand
  if (!expandedFolders.value.includes('__uncategorized__')) {
    expandedFolders.value.push('__uncategorized__');
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeydown);
  }
});

async function handleCreateNote(folderName?: string) {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
    folder: folderName,
  });
}

async function handleDeleteNote(id: string, title: string) {
  const confirmed = await confirm({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This action cannot be undone.',
    itemTitle: title || 'Untitled Note',
    variant: 'danger',
    confirmText: 'Delete Note',
    cancelText: 'Cancel',
  });

  if (confirmed) {
    await deleteNote(id);
  }
}
</script>

<template>
  <aside class="note-sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <!-- Sidebar Top Header -->
    <SidebarHeader
      @create-note="handleCreateNote()"
      @start-create-folder="startCreateFolder"
    />

    <!-- Inline Create Folder Form -->
    <div v-if="isCreatingFolder" class="inline-folder-form">
      <div class="folder-input-wrapper">
        <FolderPlus :size="14" class="folder-form-icon" />
        <input
          ref="createFolderInputRef"
          v-model="newFolderName"
          type="text"
          placeholder="Folder name..."
          class="folder-input"
          @keydown.enter="submitCreateFolder"
          @keydown.escape="cancelCreateFolder"
        />
      </div>
      <div class="folder-form-actions">
        <button
          type="button"
          class="btn-folder-action btn-folder-confirm"
          title="Confirm"
          @click="submitCreateFolder"
        >
          <Check :size="13" />
        </button>
        <button
          type="button"
          class="btn-folder-action btn-folder-cancel"
          title="Cancel"
          @click="cancelCreateFolder"
        >
          <X :size="13" />
        </button>
      </div>
    </div>

    <!-- Search & Filter Area -->
    <SidebarSearch />

    <!-- Notes & Folder Tree List -->
    <div class="sidebar-list">
      <!-- Loading State -->
      <div v-if="isLoading && notes.length === 0" class="sidebar-state-message">
        <div class="spinner"></div>
        <span>Loading notes & folders...</span>
      </div>

      <!-- Empty Matching State -->
      <div v-else-if="filteredNotes.length === 0" class="sidebar-state-message">
        <p v-if="searchQuery || selectedTag">No matching notes found</p>
        <p v-else>No notes yet. Create your first note!</p>
        <button class="btn btn-secondary btn-sm mt-2" @click="handleCreateNote()">
          <Plus :size="14" /> Create Note
        </button>
      </div>

      <!-- Directory Tree Content -->
      <div v-else class="folder-tree-container">
        <!-- "All Notes" Selector Row (Drop target for moving notes/folders to root) -->
        <div
          class="all-notes-row"
          :class="{
            active: selectedFolder === null,
            'is-drop-target': currentDropTarget === '__all__',
          }"
          @dragover.prevent="handleAllNotesDragEnter"
          @dragenter.prevent="handleAllNotesDragEnter"
          @dragleave="handleAllNotesDragLeave"
          @drop.prevent="handleAllNotesDrop"
          @click="selectedFolder = null"
        >
          <div class="all-notes-info">
            <Layers :size="15" class="all-notes-icon" />
            <span class="all-notes-label">All Notes</span>
          </div>
          <span class="folder-count-badge">{{ notes.length }}</span>
        </div>

        <!-- Hierarchical Folder Tree -->
        <FolderTreeNodeItem
          v-for="rootNode in folderTree"
          :key="rootNode.path"
          :node="rootNode"
          :renaming-folder-path="renamingFolderPath"
          :creating-subfolder-parent="creatingSubfolderParent"
          :current-drop-target="currentDropTarget"
          :dragged-item="draggedItem"
          @start-create-subfolder="startCreateSubfolder"
          @submit-create-subfolder="submitCreateSubfolder"
          @cancel-create-subfolder="cancelCreateSubfolder"
          @start-rename-folder="startRenameFolder"
          @submit-rename-folder="submitRenameFolder"
          @cancel-rename-folder="cancelRenameFolder"
          @delete-folder="handleDeleteFolder"
          @create-note="handleCreateNote"
          @open-note="openNote"
          @delete-note="handleDeleteNote"
          @drag-start-note="handleDragStartNote"
          @drag-start-folder="handleDragStartFolder"
          @drag-end="handleDragEnd"
          @folder-drag-enter="handleFolderDragEnter"
          @folder-drag-leave="handleFolderDragLeave"
          @folder-drop="handleFolderDrop"
        />

        <!-- Uncategorized Notes Section -->
        <div v-if="rootNotes.length > 0" class="folder-section uncategorized-section">
          <div
            class="folder-header uncategorized-header"
            :class="{
              active: selectedFolder === '__root__',
              expanded: isFolderExpanded('__uncategorized__'),
              'is-drop-target': currentDropTarget === '__uncategorized__',
            }"
            @dragover.prevent="handleUncategorizedDragEnter"
            @dragenter.prevent="handleUncategorizedDragEnter"
            @dragleave="handleUncategorizedDragLeave"
            @drop.prevent="handleUncategorizedDrop"
            @click="handleFolderClick('__uncategorized__')"
          >
            <div class="folder-header-left">
              <button
                type="button"
                class="btn-folder-toggle"
                @click.stop="toggleFolder('__uncategorized__')"
              >
                <ChevronDown v-if="isFolderExpanded('__uncategorized__')" :size="14" />
                <ChevronRight v-else :size="14" />
              </button>

              <Folder :size="16" class="folder-icon uncategorized-icon" />
              <span class="folder-name">Uncategorized</span>
            </div>

            <div class="folder-header-right">
              <span class="folder-count-badge">{{ rootNotes.length }}</span>
            </div>
          </div>

          <!-- Uncategorized Notes List -->
          <div
            v-if="isFolderExpanded('__uncategorized__')"
            class="folder-notes-container"
          >
            <NoteCard
              v-for="note in rootNotes"
              :key="note.id"
              :note="note"
              :is-selected="selectedNoteId === note.id"
              :is-dragging="draggedItem?.type === 'note' && draggedItem?.noteId === note.id"
              @open="openNote"
              @delete="handleDeleteNote"
              @dragstart="handleDragStartNote"
              @dragend="handleDragEnd"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Storage Quota Widget -->
    <StorageQuotaIndicator />
  </aside>
</template>

<style scoped>
.is-dragging {
  opacity: 0.4 !important;
  cursor: grabbing !important;
}

.is-drop-target {
  outline: 2px dashed var(--accent-primary) !important;
  outline-offset: -2px;
  background-color: var(--bg-surface-active) !important;
  box-shadow: 0 0 8px rgba(122, 168, 159, 0.3) !important;
}

.all-notes-row.is-drop-target,
.uncategorized-header.is-drop-target {
  outline: 2px dashed var(--accent-primary) !important;
  outline-offset: -2px;
  background-color: var(--bg-surface-active) !important;
  box-shadow: 0 0 8px rgba(122, 168, 159, 0.3) !important;
}

.note-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.sidebar-closed {
  width: 0 !important;
  min-width: 0 !important;
  border-right: none;
  visibility: hidden;
}

.inline-folder-form {
  padding: 0.5rem 0.85rem;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.folder-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.folder-form-icon {
  position: absolute;
  left: 0.5rem;
  color: var(--accent-primary);
  pointer-events: none;
}

.folder-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-focus);
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.4rem 0.3rem 1.8rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  outline: none;
}

.folder-form-actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-folder-action {
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  padding: 0.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.btn-folder-confirm {
  color: var(--accent-success);
}

.btn-folder-confirm:hover {
  background-color: var(--accent-success);
  color: var(--text-inverse);
}

.btn-folder-cancel {
  color: var(--text-muted);
}

.btn-folder-cancel:hover {
  background-color: var(--accent-danger);
  color: var(--text-inverse);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.35rem;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
}

.sidebar-state-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.82rem;
  gap: 0.75rem;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.folder-tree-container {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.all-notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  margin-bottom: 0.25rem;
  color: var(--text-secondary);
}

.all-notes-row:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
}

.all-notes-row.active {
  background-color: var(--bg-surface-active);
  color: var(--accent-primary);
  font-weight: 600;
}

.all-notes-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.all-notes-icon {
  color: var(--accent-primary);
}

.all-notes-label {
  font-size: 0.8rem;
}

.folder-count-badge {
  font-size: 0.68rem;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-full);
}

.folder-section {
  display: flex;
  flex-direction: column;
  margin-top: 0.35rem;
}

.uncategorized-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem 0.35rem 0.45rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  min-height: 28px;
}

.uncategorized-header:hover {
  background-color: var(--bg-surface-hover);
}

.uncategorized-header.active {
  background-color: var(--bg-surface-active);
}

.folder-header-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex: 1;
}

.btn-folder-toggle {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem;
  border-radius: var(--radius-sm);
  transition: color 0.12s ease;
}

.btn-folder-toggle:hover {
  color: var(--text-primary);
}

.folder-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.uncategorized-icon {
  color: var(--text-muted);
}

.folder-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-header-right {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.folder-notes-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 1.15rem;
  margin-left: 0.45rem;
  border-left: 1px dashed var(--border-subtle);
  margin-top: 0.2rem;
  margin-bottom: 0.35rem;
}
</style>
