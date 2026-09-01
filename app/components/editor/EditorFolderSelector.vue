<script setup lang="ts">
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  Check,
  X,
} from 'lucide-vue-next';
import type { Note } from '../../../shared/types/note';

const props = defineProps<{
  activeNote: Note;
}>();

const {
  folderTree,
  moveNoteToFolder,
  createFolder,
} = useNotes();

const flattenedFolders = computed(() => flattenFolderTree(folderTree.value));

const isFolderMenuOpen = ref(false);
const folderDropdownRef = ref<HTMLElement | null>(null);
const isCreatingFolderInEditor = ref(false);
const newFolderInputValue = ref('');
const newFolderInputRef = ref<HTMLInputElement | null>(null);

function toggleFolderMenu(e: MouseEvent) {
  e.stopPropagation();
  isFolderMenuOpen.value = !isFolderMenuOpen.value;
  if (!isFolderMenuOpen.value) {
    isCreatingFolderInEditor.value = false;
    newFolderInputValue.value = '';
  }
}

async function handleSelectFolder(folderName?: string) {
  await moveNoteToFolder(props.activeNote.id, folderName || '');
  isFolderMenuOpen.value = false;
  isCreatingFolderInEditor.value = false;
}

function startCreateFolderInEditor() {
  isCreatingFolderInEditor.value = true;
  newFolderInputValue.value = '';
  nextTick(() => {
    newFolderInputRef.value?.focus();
  });
}

async function handleCreateAndAssignFolder() {
  const trimmed = newFolderInputValue.value.trim();
  if (trimmed) {
    await createFolder(trimmed);
    await moveNoteToFolder(props.activeNote.id, trimmed);
  }
  isCreatingFolderInEditor.value = false;
  newFolderInputValue.value = '';
  isFolderMenuOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (folderDropdownRef.value && !folderDropdownRef.value.contains(event.target as Node)) {
    isFolderMenuOpen.value = false;
    isCreatingFolderInEditor.value = false;
  }
}

function handleDocKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFolderMenuOpen.value) {
    isFolderMenuOpen.value = false;
    isCreatingFolderInEditor.value = false;
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleDocKeydown);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleDocKeydown);
  }
});
</script>

<template>
  <div ref="folderDropdownRef" class="folder-selector-wrapper">
    <button
      type="button"
      class="btn-folder-selector"
      :class="{ active: isFolderMenuOpen }"
      title="Assign Folder"
      aria-label="Assign Folder"
      aria-haspopup="true"
      :aria-expanded="isFolderMenuOpen"
      @click="toggleFolderMenu"
    >
      <Folder :size="13" class="folder-btn-icon" />
      <span class="folder-label">{{ activeNote.folder || 'No Folder (Root)' }}</span>
      <ChevronDown :size="12" class="folder-chevron" />
    </button>

    <transition name="dropdown-fade">
      <div
        v-if="isFolderMenuOpen"
        class="folder-menu-dropdown"
        role="menu"
        aria-orientation="vertical"
        @keydown.escape="isFolderMenuOpen = false"
      >
        <div class="folder-menu-header">
          <span>Organize Folder</span>
        </div>

        <button
          type="button"
          class="folder-menu-item"
          :class="{ selected: !activeNote.folder }"
          role="menuitem"
          @click="handleSelectFolder(undefined)"
        >
          <Folder :size="14" class="item-icon-folder" />
          <div class="folder-menu-item-text">
            <span>No Folder (Root)</span>
          </div>
          <Check v-if="!activeNote.folder" :size="13" class="item-check" />
        </button>

        <div v-if="flattenedFolders.length > 0" class="folder-menu-divider"></div>

        <button
          v-for="folder in flattenedFolders"
          :key="folder.path"
          type="button"
          class="folder-menu-item"
          :class="{ selected: activeNote.folder === folder.path }"
          role="menuitem"
          @click="handleSelectFolder(folder.path)"
        >
          <div class="folder-menu-item-text folder-tree-option">
            <FolderOpen
              v-if="activeNote.folder === folder.path"
              :size="14"
              class="item-icon-folder active"
            />
            <Folder v-else :size="14" class="item-icon-folder" />
            <span class="folder-option-text">{{ folder.label }}</span>
          </div>
          <Check v-if="activeNote.folder === folder.path" :size="13" class="item-check" />
        </button>

        <div class="folder-menu-divider"></div>

        <!-- Create New Folder Inline in Dropdown -->
        <div v-if="isCreatingFolderInEditor" class="menu-create-folder-input">
          <input
            ref="newFolderInputRef"
            v-model="newFolderInputValue"
            type="text"
            placeholder="Folder name..."
            class="folder-mini-input"
            @keydown.enter.prevent="handleCreateAndAssignFolder"
            @keydown.escape.prevent="isCreatingFolderInEditor = false"
          />
          <button
            type="button"
            class="btn-mini-confirm"
            title="Create and move"
            @click="handleCreateAndAssignFolder"
          >
            <Check :size="12" />
          </button>
          <button
            type="button"
            class="btn-mini-cancel"
            title="Cancel"
            @click="isCreatingFolderInEditor = false"
          >
            <X :size="12" />
          </button>
        </div>

        <button
          v-else
          type="button"
          class="folder-menu-item folder-menu-item-add"
          role="menuitem"
          @click="startCreateFolderInEditor"
        >
          <FolderPlus :size="14" class="item-icon-add" />
          <span>+ New Folder...</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.folder-selector-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-folder-selector {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
}

.btn-folder-selector:hover,
.btn-folder-selector.active {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.folder-btn-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.folder-label {
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-chevron {
  color: var(--text-muted);
}

.folder-menu-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 200px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.3rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.folder-menu-header {
  padding: 0.35rem 0.5rem 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.folder-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.12s ease;
}

.folder-menu-item:hover {
  background-color: var(--bg-surface-hover);
}

.folder-menu-item.selected {
  font-weight: 600;
  color: var(--accent-primary);
}

.folder-menu-item-text {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
}

.folder-menu-item-text span {
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-icon-folder {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.item-check {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.folder-menu-item-add {
  color: var(--accent-primary);
  font-weight: 500;
}

.item-icon-add {
  color: var(--accent-primary);
}

.folder-menu-divider {
  height: 1px;
  background-color: var(--border-subtle);
  margin: 0.2rem 0;
}

.menu-create-folder-input {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.25rem 0.35rem;
}

.folder-mini-input {
  flex: 1;
  background-color: var(--bg-input);
  border: 1px solid var(--border-focus);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.4rem;
  color: var(--text-primary);
  font-size: 0.72rem;
  outline: none;
  min-width: 0;
}

.btn-mini-confirm,
.btn-mini-cancel {
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-mini-confirm {
  color: var(--accent-success);
}

.btn-mini-confirm:hover {
  background-color: var(--accent-success);
  color: var(--text-inverse);
}

.btn-mini-cancel {
  color: var(--text-muted);
}

.btn-mini-cancel:hover {
  background-color: var(--accent-danger);
  color: var(--text-inverse);
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
</style>
