<template>
  <aside class="note-sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-title-group">
        <FileText class="icon-brand" :size="16" />
        <h2>Notes</h2>
        <span class="notes-count-badge">{{ notes.length }}</span>
      </div>

      <div class="sidebar-header-actions">
        <!-- New Note Button -->
        <button
          type="button"
          class="btn-icon btn-sidebar-action btn-sidebar-new-note"
          title="New Note (Ctrl+N)"
          aria-label="New Note"
          @click="handleCreateNote()"
        >
          <Plus :size="15" />
        </button>

        <!-- New Folder Button -->
        <button
          type="button"
          class="btn-icon btn-sidebar-action btn-new-folder"
          title="Create New Folder"
          aria-label="Create New Folder"
          @click="startCreateFolder"
        >
          <FolderPlus :size="15" />
        </button>

        <!-- Export All Dropdown -->
        <div ref="exportMenuRef" class="export-all-wrapper">
          <button
            type="button"
            class="btn-icon btn-sidebar-action btn-export-all"
            :class="{ active: isExportOpen }"
            title="Export all notes"
            aria-label="Export all notes"
            aria-haspopup="true"
            :aria-expanded="isExportOpen"
            @click="toggleExportMenu"
          >
            <Download :size="15" />
          </button>

          <transition name="dropdown-fade">
            <div
              v-if="isExportOpen"
              class="export-all-menu"
              role="menu"
              aria-orientation="vertical"
              @keydown.escape="isExportOpen = false"
            >
              <div class="menu-header">
                <span>Export All ({{ notes.length }})</span>
              </div>

              <button
                type="button"
                class="menu-item"
                role="menuitem"
                @click="handleExportAll('json')"
              >
                <Braces :size="15" class="item-icon-json" />
                <div class="item-content">
                  <span class="item-title">JSON Backup</span>
                  <span class="item-subtitle">Full backup (.json)</span>
                </div>
              </button>

              <button
                type="button"
                class="menu-item"
                role="menuitem"
                @click="handleExportAll('md')"
              >
                <FileText :size="15" class="item-icon-md" />
                <div class="item-content">
                  <span class="item-title">Markdown Digest</span>
                  <span class="item-subtitle">Combined doc with TOC (.md)</span>
                </div>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>

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
    <div class="sidebar-search-area">
      <div class="search-box">
        <Search class="search-icon" :size="15" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notes or tags..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          class="btn-clear-search"
          title="Clear search"
          @click="searchQuery = ''"
        >
          <X :size="14" />
        </button>
      </div>

      <!-- Tag Filter Chips -->
      <div v-if="allTags.length > 0" class="tags-filter-scroll">
        <button
          class="tag-filter-pill"
          :class="{ active: selectedTag === null }"
          @click="selectedTag = null"
        >
          All
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag-filter-pill"
          :class="{ active: selectedTag === tag }"
          @click="toggleTagFilter(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

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
            <div
              v-for="note in rootNotes"
              :key="note.id"
              class="note-list-item folder-note-item"
              :class="{
                active: selectedNoteId === note.id,
                'is-dragging': draggedItem?.type === 'note' && draggedItem?.noteId === note.id,
              }"
              draggable="true"
              @dragstart="handleDragStartNote($event, note)"
              @dragend="handleDragEnd"
              @click="openNote(note.id)"
            >
              <div class="note-item-main">
                <div class="note-item-header">
                  <h3 class="note-item-title">{{ note.title || 'Untitled Note' }}</h3>
                  <button
                    class="btn-icon btn-icon-danger btn-delete-note"
                    title="Delete Note"
                    aria-label="Delete Note"
                    @click.stop="handleDeleteNote(note.id, note.title)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>

                <p class="note-item-preview">
                  {{ getPreviewSnippet(note.content) }}
                </p>

                <div class="note-item-meta">
                  <span class="note-date">
                    <Calendar :size="11" />
                    {{ formatDate(note.updatedAt) }}
                  </span>

                  <div v-if="note.tags && note.tags.length > 0" class="note-tags-list">
                    <span
                      v-for="t in note.tags.slice(0, 2)"
                      :key="t"
                      class="tag-chip"
                    >
                      #{{ t }}
                    </span>
                    <span v-if="note.tags.length > 2" class="tag-chip-more">
                      +{{ note.tags.length - 2 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import {
  FileText,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  Calendar,
  Download,
  Braces,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { useConfirm } from '../composables/useConfirm';
import { exportNoteJson, exportCombinedMarkdown, downloadBlob } from '../utils/export';
import FolderTreeNodeItem from './FolderTreeNodeItem.vue';
import type { Note } from '../../shared/types/note';

const {
  notes,
  folderTree,
  rootNotes,
  expandedFolders,
  selectedFolder,
  selectedNoteId,
  searchQuery,
  selectedTag,
  allTags,
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
  toggleTagFilter,
  flushAutoSave,
} = useNotes();

const { confirm } = useConfirm();

const isExportOpen = ref(false);
const exportMenuRef = ref<HTMLElement | null>(null);

// Folder creation inline state
const isCreatingFolder = ref(false);
const newFolderName = ref('');
const createFolderInputRef = ref<HTMLInputElement | null>(null);

// Subfolder creation inline state
const creatingSubfolderParent = ref<string | null>(null);

// Folder rename inline state
const renamingFolderPath = ref<string | null>(null);

// Drag and drop state
const draggedItem = ref<
  { type: 'note'; noteId: string; sourceFolder?: string } | { type: 'folder'; path: string } | null
>(null);
const currentDropTarget = ref<string | null>(null);
const isDragging = ref(false);

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

// Drag & Drop Event Handlers
function handleDragStartNote(e: DragEvent, note: Note) {
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

function handleDragStartFolder(e: DragEvent, folderPath: string) {
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

function handleDragEnd() {
  isDragging.value = false;
  draggedItem.value = null;
  currentDropTarget.value = null;
}

function handleFolderDragEnter(folderPath: string) {
  if (draggedItem.value?.type === 'folder') {
    if (folderPath === draggedItem.value.path || folderPath.startsWith(draggedItem.value.path + '/')) {
      return;
    }
  }
  currentDropTarget.value = folderPath;
}

function handleFolderDragLeave(folderPath: string) {
  if (currentDropTarget.value === folderPath) {
    currentDropTarget.value = null;
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

function toggleExportMenu(e: MouseEvent) {
  e.stopPropagation();
  isExportOpen.value = !isExportOpen.value;
}

function handleExportAll(type: 'json' | 'md') {
  flushAutoSave();
  isExportOpen.value = false;

  if (type === 'json') {
    const content = exportNoteJson(notes.value);
    downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
  } else if (type === 'md') {
    const content = exportCombinedMarkdown(notes.value);
    downloadBlob(content, 'notes-digest.md', 'text/markdown;charset=utf-8');
  }
}

function handleClickOutside(event: MouseEvent) {
  if (exportMenuRef.value && !exportMenuRef.value.contains(event.target as Node)) {
    isExportOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isExportOpen.value) isExportOpen.value = false;
    if (isCreatingFolder.value) cancelCreateFolder();
    if (creatingSubfolderParent.value) cancelCreateSubfolder();
    if (renamingFolderPath.value) cancelRenameFolder();
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }
  // Ensure default folders expand
  if (!expandedFolders.value.includes('__uncategorized__')) {
    expandedFolders.value.push('__uncategorized__');
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
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

function getPreviewSnippet(content: string): string {
  if (!content) return 'No additional text';
  const clean = content
    .replace(/^#+\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();

  const firstLine = clean.split('\n').filter((l) => l.trim().length > 0)[0] || '';
  return firstLine.slice(0, 80) + (firstLine.length > 80 ? '...' : '') || 'Empty note';
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
</script>

<style scoped>
/* Drag and Drop Visual Feedback */
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
  flex-shrink: 0;
  overflow: hidden;
  will-change: margin-left, opacity;
  transition:
    margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease,
    border-color 0.25s ease,
    visibility 0.25s ease;
  z-index: 10;
}

.note-sidebar.sidebar-closed {
  margin-left: calc(-1 * var(--sidebar-width));
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  border-right-color: transparent;
}

.sidebar-header {
  padding: 0.75rem 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  gap: 0.5rem;
}

.sidebar-title-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.sidebar-title-group h2 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-brand {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.notes-count-badge {
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.65rem;
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.btn-sidebar-action {
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-sidebar-action:hover,
.btn-sidebar-action.active {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.btn-sidebar-new-note:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.export-all-wrapper {
  position: relative;
  display: inline-flex;
}

.export-all-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 220px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.35rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.menu-header {
  padding: 0.4rem 0.6rem 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
}

.menu-item:hover,
.menu-item:focus {
  background-color: var(--bg-surface-hover);
  outline: none;
}

.item-icon-json {
  color: var(--accent-warning);
  flex-shrink: 0;
}

.item-icon-md {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.item-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
}

.item-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Inline Create/Rename Folder Form */
.inline-folder-form {
  padding: 0.5rem 0.85rem;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.folder-rename-form {
  border-radius: var(--radius-sm);
  margin: 0.15rem 0.35rem;
  padding: 0.35rem 0.5rem;
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

.sidebar-search-area {
  padding: 0.65rem 0.85rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.4rem 1.8rem 0.4rem 2rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px var(--border-subtle);
}

.btn-clear-search {
  position: absolute;
  right: 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 50%;
}

.btn-clear-search:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

.tags-filter-scroll {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tags-filter-scroll::-webkit-scrollbar {
  display: none;
}

.tag-filter-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tag-filter-pill:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.tag-filter-pill.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
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
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.825rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 20px;
  height: 20px;
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
  gap: 0.25rem;
}

/* All Notes Row */
.all-notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.all-notes-row:hover {
  background-color: var(--bg-surface);
}

.all-notes-row.active {
  background-color: var(--bg-surface-active);
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

/* Folder Section & Header */
.folder-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.15rem;
}

.folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  user-select: none;
}

.folder-header:hover {
  background-color: var(--bg-surface);
}

.folder-header.active {
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

.folder-icon.open {
  color: var(--accent-primary);
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

.folder-count-badge {
  font-size: 0.68rem;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-full);
}

.folder-hover-actions {
  display: none;
  align-items: center;
  gap: 0.15rem;
}

.folder-header:hover .folder-hover-actions,
.folder-header:focus-within .folder-hover-actions {
  display: flex;
}

@media (hover: none) {
  .folder-hover-actions {
    display: flex;
    opacity: 0.9;
  }
}

.btn-icon-folder {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
}

.btn-icon-folder:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
}

.btn-icon-folder-danger:hover {
  background-color: rgba(196, 116, 110, 0.2);
  color: var(--accent-danger);
}

/* Folder Notes Container */
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

.folder-empty-notice {
  font-size: 0.72rem;
  color: var(--text-muted);
  padding: 0.35rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-empty-add {
  background: transparent;
  border: 1px dashed var(--border-subtle);
  color: var(--accent-primary);
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-empty-add:hover {
  background: var(--bg-surface);
  border-color: var(--accent-primary);
}

.folder-note-item {
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-md);
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s ease;
}

.folder-note-item:hover {
  background-color: var(--bg-surface);
}

.folder-note-item.active {
  background-color: var(--bg-surface-active);
  border-color: var(--border-focus);
}

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}

.note-item-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.btn-delete-note {
  opacity: 0;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: opacity 0.15s ease;
}

.folder-note-item:hover .btn-delete-note {
  opacity: 1;
}

@media (hover: none) {
  .btn-delete-note {
    opacity: 0.85;
  }
}

.note-item-preview {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.note-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.note-date {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
}

.note-tags-list {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  overflow: hidden;
}

.tag-chip {
  background: var(--bg-surface);
  color: var(--accent-primary);
  border: 1px solid var(--border-subtle);
  font-size: 0.62rem;
  padding: 0.04rem 0.3rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.tag-chip-more {
  font-size: 0.62rem;
  color: var(--text-muted);
}

.uncategorized-icon {
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .note-sidebar {
    width: 100%;
    min-width: 100%;
    border-right: none;
    flex: 1;
    transition:
      margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.2s ease,
      visibility 0.25s ease;
  }

  .note-sidebar.sidebar-closed {
    margin-left: -100%;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .folder-header {
    min-height: 44px;
    padding: 0.6rem 0.75rem;
  }

  .folder-hover-actions {
    display: flex;
    opacity: 0.9;
  }

  .btn-icon-folder {
    min-width: 36px;
    min-height: 36px;
  }

  .btn-delete-note {
    opacity: 0.85;
    padding: 0.4rem;
  }

  .folder-note-item {
    padding: 0.75rem 0.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .note-sidebar {
    transition: none !important;
  }
}
</style>
