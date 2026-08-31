<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-vue-next';
import type { FolderTreeNode, Note } from '../../shared/types/note';
import { useNotes } from '../composables/useNotes';
import NoteCard from './common/NoteCard.vue';

const props = defineProps<{
  node: FolderTreeNode;
  renamingFolderPath: string | null;
  creatingSubfolderParent: string | null;
  currentDropTarget: string | null;
  draggedItem: any;
}>();

const emit = defineEmits<{
  (e: 'start-create-subfolder', parentPath: string): void;
  (e: 'submit-create-subfolder', parentPath: string, name: string): void;
  (e: 'cancel-create-subfolder'): void;
  (e: 'start-rename-folder', path: string, currentName: string): void;
  (e: 'submit-rename-folder', oldPath: string, newName: string): void;
  (e: 'cancel-rename-folder'): void;
  (e: 'delete-folder', path: string): void;
  (e: 'create-note', folderPath: string): void;
  (e: 'open-note', noteId: string): void;
  (e: 'delete-note', noteId: string, title: string): void;
  (e: 'drag-start-note', event: DragEvent, note: Note): void;
  (e: 'drag-start-folder', event: DragEvent, folderPath: string): void;
  (e: 'drag-end'): void;
  (e: 'folder-drag-enter', folderPath: string): void;
  (e: 'folder-drag-leave', folderPath: string): void;
  (e: 'folder-drop', folderPath: string): void;
}>();

const {
  expandedFolders,
  selectedFolder,
  selectedNoteId,
  notesByFolder,
  toggleFolder,
} = useNotes();

const renameFolderValue = ref(props.node.name);
const renameInputRef = ref<HTMLInputElement | null>(null);

const subfolderInputValue = ref('');
const subfolderInputRef = ref<HTMLInputElement | null>(null);

const isExpanded = computed(() => expandedFolders.value.includes(props.node.path));
const folderNotes = computed<Note[]>(() => notesByFolder.value[props.node.path] || []);
const noteCount = computed(() => folderNotes.value.length);
const isNodeDragging = computed(() => {
  return props.draggedItem?.type === 'folder' && props.draggedItem?.path === props.node.path;
});

watch(
  () => props.renamingFolderPath,
  (newPath) => {
    if (newPath === props.node.path) {
      renameFolderValue.value = props.node.name;
      nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
      });
    }
  }
);

watch(
  () => props.creatingSubfolderParent,
  (parent) => {
    if (parent === props.node.path) {
      subfolderInputValue.value = '';
      nextTick(() => {
        subfolderInputRef.value?.focus();
      });
    }
  }
);

function handleFolderClick() {
  toggleFolder(props.node.path);
}

function startCreateSubfolder() {
  if (!isExpanded.value) {
    toggleFolder(props.node.path);
  }
  emit('start-create-subfolder', props.node.path);
}

function submitSubfolder() {
  const trimmed = subfolderInputValue.value.trim();
  if (trimmed) {
    emit('submit-create-subfolder', props.node.path, trimmed);
  }
  subfolderInputValue.value = '';
}

function cancelSubfolder() {
  subfolderInputValue.value = '';
  emit('cancel-create-subfolder');
}

function startRename() {
  emit('start-rename-folder', props.node.path, props.node.name);
}

function submitRename() {
  const trimmed = renameFolderValue.value.trim();
  if (trimmed && trimmed !== props.node.name) {
    emit('submit-rename-folder', props.node.path, trimmed);
  } else {
    emit('cancel-rename-folder');
  }
}

function cancelRename() {
  emit('cancel-rename-folder');
}

function emitCreateNote(path: string) {
  emit('create-note', path);
}

function emitDeleteFolder(path: string) {
  emit('delete-folder', path);
}

function emitOpenNote(id: string) {
  emit('open-note', id);
}

function emitDeleteNote(id: string, title: string) {
  emit('delete-note', id, title);
}

function onFolderDragStart(e: DragEvent) {
  emit('drag-start-folder', e, props.node.path);
}

function onNoteDragStart(e: DragEvent, note: Note) {
  emit('drag-start-note', e, note);
}

function onDragEnd() {
  emit('drag-end');
}

function onFolderDragOver(e: DragEvent) {
  if (props.draggedItem?.type === 'folder') {
    if (props.node.path === props.draggedItem.path || props.node.path.startsWith(props.draggedItem.path + '/')) {
      return;
    }
  }
  emit('folder-drag-enter', props.node.path);
}

function onFolderDragEnter(e: DragEvent) {
  if (props.draggedItem?.type === 'folder') {
    if (props.node.path === props.draggedItem.path || props.node.path.startsWith(props.draggedItem.path + '/')) {
      return;
    }
  }
  emit('folder-drag-enter', props.node.path);
}

function onFolderDragLeave(e: DragEvent) {
  emit('folder-drag-leave', props.node.path);
}

function onFolderDrop(e: DragEvent) {
  emit('folder-drop', props.node.path);
}
</script>

<template>
  <div class="folder-tree-node" :class="{ 'has-children': node.children && node.children.length > 0 }">
    <!-- Inline Rename Form for this folder -->
    <div
      v-if="renamingFolderPath === node.path"
      class="inline-folder-form folder-rename-form"
      :style="{ paddingLeft: `calc(0.5rem + ${node.depth * 14}px)` }"
    >
      <div class="folder-input-wrapper">
        <Folder :size="14" class="folder-form-icon" />
        <input
          ref="renameInputRef"
          v-model="renameFolderValue"
          type="text"
          class="folder-input"
          @keydown.enter="submitRename"
          @keydown.escape="cancelRename"
        />
      </div>
      <div class="folder-form-actions">
        <button
          type="button"
          class="btn-folder-action btn-folder-confirm"
          title="Confirm rename"
          @click="submitRename"
        >
          <Check :size="13" />
        </button>
        <button
          type="button"
          class="btn-folder-action btn-folder-cancel"
          title="Cancel"
          @click="cancelRename"
        >
          <X :size="13" />
        </button>
      </div>
    </div>

    <!-- Folder Header Row -->
    <div
      v-else
      class="folder-header"
      :class="{
        active: selectedFolder === node.path,
        expanded: isExpanded,
        'is-dragging': isNodeDragging,
        'is-drop-target': currentDropTarget === node.path,
      }"
      :style="{ paddingLeft: `calc(0.45rem + ${node.depth * 14}px)` }"
      draggable="true"
      @dragstart="onFolderDragStart($event)"
      @dragend="onDragEnd"
      @dragover.prevent="onFolderDragOver($event)"
      @dragenter.prevent="onFolderDragEnter($event)"
      @dragleave="onFolderDragLeave($event)"
      @drop.prevent="onFolderDrop($event)"
      @click="handleFolderClick"
    >
      <div class="folder-header-left">
        <button
          type="button"
          class="btn-folder-toggle"
          :title="isExpanded ? 'Collapse folder' : 'Expand folder'"
          @click.stop="toggleFolder(node.path)"
        >
          <ChevronDown v-if="isExpanded" :size="14" />
          <ChevronRight v-else :size="14" />
        </button>

        <FolderOpen
          v-if="isExpanded"
          :size="16"
          class="folder-icon open"
        />
        <Folder v-else :size="16" class="folder-icon" />

        <span class="folder-name" :title="node.path">{{ node.name }}</span>
      </div>

      <div class="folder-header-right">
        <span class="folder-count-badge">
          {{ noteCount }}
        </span>

        <div class="folder-hover-actions">
          <!-- Add Note Directly In Folder -->
          <button
            type="button"
            class="btn-icon-folder"
            title="New note in folder"
            aria-label="New note in folder"
            @click.stop="emitCreateNote(node.path)"
          >
            <Plus :size="13" />
          </button>

          <!-- Add Subfolder In Folder -->
          <button
            type="button"
            class="btn-icon-folder"
            title="New subfolder"
            aria-label="New subfolder"
            @click.stop="startCreateSubfolder"
          >
            <FolderPlus :size="13" />
          </button>

          <!-- Rename Folder -->
          <button
            type="button"
            class="btn-icon-folder"
            title="Rename folder"
            aria-label="Rename folder"
            @click.stop="startRename"
          >
            <Pencil :size="12" />
          </button>

          <!-- Delete Folder -->
          <button
            type="button"
            class="btn-icon-folder btn-icon-folder-danger"
            title="Delete folder"
            aria-label="Delete folder"
            @click.stop="emitDeleteFolder(node.path)"
          >
            <Trash2 :size="12" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded Children & Notes Container -->
    <div v-if="isExpanded" class="folder-children-container">
      <!-- Inline Create Subfolder Form -->
      <div
        v-if="creatingSubfolderParent === node.path"
        class="inline-folder-form subfolder-inline-form"
        :style="{ paddingLeft: `calc(0.5rem + ${(node.depth + 1) * 14}px)` }"
      >
        <div class="folder-input-wrapper">
          <FolderPlus :size="14" class="folder-form-icon" />
          <input
            ref="subfolderInputRef"
            v-model="subfolderInputValue"
            type="text"
            placeholder="Subfolder name..."
            class="folder-input"
            @keydown.enter="submitSubfolder"
            @keydown.escape="cancelSubfolder"
          />
        </div>
        <div class="folder-form-actions">
          <button
            type="button"
            class="btn-folder-action btn-folder-confirm"
            title="Confirm"
            @click="submitSubfolder"
          >
            <Check :size="13" />
          </button>
          <button
            type="button"
            class="btn-folder-action btn-folder-cancel"
            title="Cancel"
            @click="cancelSubfolder"
          >
            <X :size="13" />
          </button>
        </div>
      </div>

      <!-- Recursive Subfolder Nodes -->
      <FolderTreeNodeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :renaming-folder-path="renamingFolderPath"
        :creating-subfolder-parent="creatingSubfolderParent"
        :current-drop-target="currentDropTarget"
        :dragged-item="draggedItem"
        @start-create-subfolder="$emit('start-create-subfolder', $event)"
        @submit-create-subfolder="(p, n) => $emit('submit-create-subfolder', p, n)"
        @cancel-create-subfolder="$emit('cancel-create-subfolder')"
        @start-rename-folder="(p, n) => $emit('start-rename-folder', p, n)"
        @submit-rename-folder="(p, n) => $emit('submit-rename-folder', p, n)"
        @cancel-rename-folder="$emit('cancel-rename-folder')"
        @delete-folder="$emit('delete-folder', $event)"
        @create-note="$emit('create-note', $event)"
        @open-note="$emit('open-note', $event)"
        @delete-note="(id, t) => $emit('delete-note', id, t)"
        @drag-start-note="(e, note) => $emit('drag-start-note', e, note)"
        @drag-start-folder="(e, path) => $emit('drag-start-folder', e, path)"
        @drag-end="$emit('drag-end')"
        @folder-drag-enter="$emit('folder-drag-enter', $event)"
        @folder-drag-leave="$emit('folder-drag-leave', $event)"
        @folder-drop="$emit('folder-drop', $event)"
      />

      <!-- Direct Notes List in this Folder -->
      <div
        v-if="folderNotes.length > 0"
        class="folder-notes-container"
        :style="{ paddingLeft: `calc(0.45rem + ${(node.depth + 1) * 14}px)` }"
      >
        <NoteCard
          v-for="note in folderNotes"
          :key="note.id"
          :note="note"
          :is-selected="selectedNoteId === note.id"
          :is-dragging="draggedItem?.type === 'note' && draggedItem?.noteId === note.id"
          @open="emitOpenNote"
          @delete="emitDeleteNote"
          @dragstart="onNoteDragStart"
          @dragend="onDragEnd"
        />
      </div>

      <!-- Empty Notice if no subfolders and no direct notes -->
      <div
        v-else-if="(!node.children || node.children.length === 0) && creatingSubfolderParent !== node.path"
        class="folder-empty-notice"
        :style="{ paddingLeft: `calc(0.5rem + ${(node.depth + 1) * 14}px)` }"
      >
        <span>Empty folder.</span>
        <button
          type="button"
          class="btn-empty-add"
          @click="emitCreateNote(node.path)"
        >
          <Plus :size="12" /> Add note
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-tree-node {
  display: flex;
  flex-direction: column;
  user-select: none;
}

.folder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem 0.35rem 0.45rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
  min-height: 28px;
}

.folder-header:hover {
  background-color: var(--bg-surface-hover);
}

.folder-header.active {
  background-color: var(--bg-surface-active);
}

.folder-header.is-dragging {
  opacity: 0.4 !important;
  cursor: grabbing !important;
}

.folder-header.is-drop-target {
  outline: 2px dashed var(--accent-primary) !important;
  outline-offset: -2px;
  background-color: var(--bg-surface-active) !important;
  box-shadow: 0 0 8px rgba(122, 168, 159, 0.3) !important;
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

.folder-children-container {
  display: flex;
  flex-direction: column;
}

.folder-notes-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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

.subfolder-inline-form {
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
</style>
