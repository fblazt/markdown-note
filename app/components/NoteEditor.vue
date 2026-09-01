<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';

const {
  activeNote,
  saveStatus,
  queueAutoSave,
  flushAutoSave,
  deleteNote,
} = useNotes();

const { confirm } = useConfirm();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

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
          <EditorSaveStatus :save-status="saveStatus" />

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
        <EditorFolderSelector :active-note="activeNote" />

        <span class="meta-divider"></span>

        <EditorTagBar :active-note="activeNote" />
      </div>

      <!-- Formatting Toolbar -->
      <EditorToolbar @format="insertFormat" />
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
  padding: 1.25rem 1.25rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background-color: var(--bg-surface);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}

.editor-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
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

.editor-header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.btn-header-delete {
  color: var(--text-muted);
}

.btn-header-delete:hover {
  color: var(--accent-danger);
  background-color: rgba(196, 116, 110, 0.15);
}

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
  height: 100%;
  background-color: var(--bg-app);
  border-right: 1px solid var(--border-color);
}

.empty-message {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
  max-width: 360px;
}

.empty-message h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-message p {
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
