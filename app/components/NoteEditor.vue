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

      <!-- Tag Management Bar -->
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
              @click="removeTag(index)"
              title="Remove tag"
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
import { ref } from 'vue';
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
} from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { useConfirm } from '../composables/useConfirm';
import ExportDropdown from './ExportDropdown.vue';

const { activeNote, saveStatus, queueAutoSave, flushAutoSave, deleteNote } = useNotes();
const { confirm } = useConfirm();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const newTagInput = ref('');

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

.tag-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
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
