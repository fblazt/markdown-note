<template>
  <div v-if="activeNote" class="note-editor">
    <!-- Editor Header: Title, Tags & Save Status -->
    <div class="editor-header">
      <div class="editor-title-row">
        <input
          :value="activeNote.title"
          type="text"
          placeholder="Note title..."
          class="title-input"
          @input="handleTitleInput"
          @blur="flushAutoSave"
        />

        <div class="editor-header-actions">
          <div class="save-status-indicator">
            <span v-if="saveStatus === 'saving'" class="status-badge saving">
              <Loader2 class="icon-spin" :size="13" /> Saving...
            </span>
            <span v-else-if="saveStatus === 'saved'" class="status-badge saved">
              <Check :size="13" /> Saved
            </span>
            <span v-else-if="saveStatus === 'unsaved'" class="status-badge unsaved">
              <Clock :size="13" /> Unsaved
            </span>
            <span v-else-if="saveStatus === 'error'" class="status-badge error">
              <AlertCircle :size="13" /> Error saving
            </span>
          </div>

          <ExportDropdown :note="activeNote" />

          <button
            type="button"
            class="btn-icon btn-icon-danger btn-header-delete"
            title="Delete Note"
            aria-label="Delete Note"
            @click="handleDeleteActiveNote"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>

      <!-- Meta & Tag Management Bar -->
      <div class="meta-bar">
        <!-- Folder Selector Dropdown -->
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

        <span class="meta-divider"></span>

        <!-- Tag Management -->
        <div class="tag-bar">
          <Tag :size="13" class="tag-icon" />
          <div class="tags-container">
            <span
              v-for="(tag, index) in activeNote.tags || []"
              :key="index"
              class="tag-badge"
            >
              #{{ tag }}
              <button
                class="btn-remove-tag"
                title="Remove tag"
                @click="removeTag(index)"
              >
                <X :size="11" />
              </button>
            </span>

            <input
              v-model="newTagInput"
              type="text"
              placeholder="+ Add tag (Enter)"
              class="tag-input"
              @keydown.enter.prevent="addTag"
              @keydown.backspace="handleTagBackspace"
            />
          </div>
        </div>
      </div>

      <!-- Formatting Toolbar -->
      <div class="editor-toolbar">
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('bold')"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('italic')"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('strikethrough')"
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Strikethrough :size="15" />
        </button>

        <span class="toolbar-divider"></span>

        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('h1')"
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('h2')"
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('h3')"
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 :size="15" />
        </button>

        <span class="toolbar-divider"></span>

        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('code')"
          title="Code Block"
          aria-label="Code block"
        >
          <Code :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('link')"
          title="Insert Link"
          aria-label="Insert link"
        >
          <Link :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('bullet-list')"
          title="Bullet List"
          aria-label="Bullet list"
        >
          <List :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('task-list')"
          title="Task List"
          aria-label="Task list"
        >
          <ListTodo :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('blockquote')"
          title="Quote"
          aria-label="Quote"
        >
          <Quote :size="15" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          @click="insertFormat('table')"
          title="Insert Table"
          aria-label="Insert table"
        >
          <Table :size="15" />
        </button>
      </div>
    </div>

    <!-- Textarea Body -->
    <div class="editor-body">
      <textarea
        ref="textareaRef"
        :value="activeNote.content"
        placeholder="Type markdown content here..."
        class="markdown-textarea"
        spellcheck="false"
        @input="handleContentInput"
        @keydown="handleKeyDown"
        @blur="flushAutoSave"
      ></textarea>
    </div>

  </div>

  <div v-else class="editor-empty-state">
    <div class="empty-message">
      <h3>No note selected</h3>
      <p>Select a note from the sidebar or create a new one to begin editing.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Link,
  List,
  ListTodo,
  Quote,
  Table,
  Check,
  Clock,
  Loader2,
  AlertCircle,
  Tag,
  X,
  Trash2,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronDown,
} from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { useConfirm } from '../composables/useConfirm';
import type { FolderTreeNode } from '../../shared/types/note';
import ExportDropdown from './ExportDropdown.vue';

const {
  activeNote,
  folderList,
  folderTree,
  saveStatus,
  queueAutoSave,
  flushAutoSave,
  deleteNote,
  moveNoteToFolder,
  createFolder,
} = useNotes();
const { confirm } = useConfirm();

interface FlattenedFolderOption {
  name: string;
  path: string;
  depth: number;
  label: string;
}

function flattenFolderTree(nodes: FolderTreeNode[]): FlattenedFolderOption[] {
  const result: FlattenedFolderOption[] = [];
  function traverse(list: FolderTreeNode[]) {
    for (const node of list) {
      const prefix = node.depth > 0 ? ' '.repeat(node.depth * 2) + '↳ ' : '';
      result.push({
        name: node.name,
        path: node.path,
        depth: node.depth,
        label: prefix + node.name,
      });
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return result;
}

const flattenedFolders = computed(() => flattenFolderTree(folderTree.value));

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const newTagInput = ref('');

// Folder selector dropdown state
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
  if (!activeNote.value) return;
  await moveNoteToFolder(activeNote.value.id, folderName || '');
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
  if (trimmed && activeNote.value) {
    await createFolder(trimmed);
    await moveNoteToFolder(activeNote.value.id, trimmed);
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

async function handleDeleteActiveNote() {
  if (!activeNote.value) return;
  const confirmed = await confirm({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This action cannot be undone.',
    itemTitle: activeNote.value.title || 'Untitled Note',
    variant: 'danger',
    confirmText: 'Delete Note',
    cancelText: 'Cancel',
  });

  if (confirmed) {
    await deleteNote(activeNote.value.id);
  }
}

function handleTitleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  queueAutoSave({ title: target.value });
}

function handleContentInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  queueAutoSave({ content: target.value });
}

function addTag() {
  const tag = newTagInput.value.trim().replace(/^#/, '');
  if (!tag || !activeNote.value) return;

  const currentTags = Array.isArray(activeNote.value.tags) ? [...activeNote.value.tags] : [];
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    queueAutoSave({ tags: currentTags });
  }
  newTagInput.value = '';
}

function removeTag(index: number) {
  if (!activeNote.value) return;
  const currentTags = Array.isArray(activeNote.value.tags) ? [...activeNote.value.tags] : [];
  currentTags.splice(index, 1);
  queueAutoSave({ tags: currentTags });
}

function handleTagBackspace() {
  if (!newTagInput.value && activeNote.value && activeNote.value.tags?.length) {
    removeTag(activeNote.value.tags.length - 1);
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Save shortcut: Ctrl+S or Cmd+S
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    flushAutoSave();
    return;
  }

  // Bold shortcut: Ctrl+B or Cmd+B
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    insertFormat('bold');
    return;
  }

  // Italic shortcut: Ctrl+I or Cmd+I
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
    e.preventDefault();
    insertFormat('italic');
    return;
  }

  // Tab key: Insert 2 spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    insertTextAtCursor('  ');
    return;
  }
}

function insertTextAtCursor(text: string) {
  const textarea = textareaRef.value;
  if (!textarea || !activeNote.value) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const content = textarea.value;

  const newContent = content.substring(0, start) + text + content.substring(end);
  queueAutoSave({ content: newContent });

  // Restore cursor position after Vue re-renders
  setTimeout(() => {
    textarea.focus();
    textarea.selectionStart = start + text.length;
    textarea.selectionEnd = start + text.length;
  }, 0);
}

function insertFormat(type: string) {
  const textarea = textareaRef.value;
  if (!textarea || !activeNote.value) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const content = textarea.value;

  let replacement = '';
  let cursorOffset = 0;

  switch (type) {
    case 'bold':
      replacement = selectedText ? `**${selectedText}**` : '**bold text**';
      cursorOffset = selectedText ? replacement.length : 2;
      break;
    case 'italic':
      replacement = selectedText ? `*${selectedText}*` : '*italic text*';
      cursorOffset = selectedText ? replacement.length : 1;
      break;
    case 'strikethrough':
      replacement = selectedText ? `~~${selectedText}~~` : '~~strikethrough~~';
      cursorOffset = selectedText ? replacement.length : 2;
      break;
    case 'h1':
      replacement = `\n# ${selectedText || 'Heading 1'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h2':
      replacement = `\n## ${selectedText || 'Heading 2'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h3':
      replacement = `\n### ${selectedText || 'Heading 3'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'code':
      if (selectedText.includes('\n') || selectedText.length === 0) {
        replacement = `\n\`\`\`typescript\n${selectedText || '// Code here'}\n\`\`\`\n`;
      } else {
        replacement = `\`${selectedText}\``;
      }
      cursorOffset = replacement.length;
      break;
    case 'link':
      replacement = selectedText ? `[${selectedText}](https://example.com)` : '[link text](https://example.com)';
      cursorOffset = replacement.length;
      break;
    case 'bullet-list':
      replacement = `\n- ${selectedText || 'List item'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'task-list':
      replacement = `\n- [ ] ${selectedText || 'New task'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'blockquote':
      replacement = `\n> ${selectedText || 'Quote text'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'table':
      replacement = `\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Value 1 | Value 2 |\n`;
      cursorOffset = replacement.length;
      break;
    default:
      return;
  }

  const newContent = content.substring(0, start) + replacement + content.substring(end);
  queueAutoSave({ content: newContent });

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
  }, 0);
}
</script>

<style scoped>
.note-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-app);
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-color);
  transition: border-color 0.25s ease;
}

.editor-header {
  padding: 0.85rem 1.25rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-app);
  flex-shrink: 0;
}

.editor-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.editor-header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.title-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  outline: none;
  font-family: var(--font-sans);
  min-width: 0;
}

.title-input::placeholder {
  color: var(--text-muted);
}

.save-status-indicator {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Meta & Tag Bar */
.meta-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.meta-divider {
  width: 1px;
  height: 14px;
  background-color: var(--border-subtle);
  flex-shrink: 0;
}

/* Folder Selector Dropdown */
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

/* Tag Management Bar */
.tag-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}

.tag-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.tags-container {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  flex: 1;
}

.btn-remove-tag {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.1rem;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.btn-remove-tag:hover {
  background-color: rgba(196, 116, 110, 0.2);
  color: var(--accent-danger);
}

.tag-input {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  outline: none;
  min-width: 110px;
}

.tag-input::placeholder {
  color: var(--text-muted);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-top: 0.4rem;
  padding-bottom: 0.15rem;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.editor-toolbar::-webkit-scrollbar {
  display: none;
}

.toolbar-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.toolbar-btn:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: var(--border-subtle);
  margin: 0 0.3rem;
  flex-shrink: 0;
}

.editor-body {
  flex: 1;
  display: flex;
  padding: 1.25rem;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  resize: none;
  outline: none;
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-primary);
  tab-size: 2;
}

.markdown-textarea::placeholder {
  color: var(--text-muted);
}

.editor-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
  padding: 2rem;
}

.empty-message h3 {
  color: var(--text-primary);
  font-size: 1.1rem;
  margin-bottom: 0.4rem;
}

.empty-message p {
  font-size: 0.85rem;
}

@media (max-width: 767px) {
  .note-editor {
    border-right: none;
    width: 100%;
  }

  .editor-header {
    padding: 0.75rem 1rem 0.4rem;
    gap: 0.5rem;
  }

  .title-input {
    font-size: 16px !important;
    font-weight: 700;
  }

  .tag-input {
    font-size: 16px !important;
  }

  .btn-folder-selector {
    min-height: 38px;
    padding: 0.4rem 0.65rem;
  }

  .toolbar-btn {
    min-width: 38px;
    min-height: 38px;
    padding: 0.45rem;
  }

  .editor-body {
    padding: 0.85rem 1rem;
  }

  .markdown-textarea {
    font-size: 16px !important;
    line-height: 1.6;
  }
}
</style>

