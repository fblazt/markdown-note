<script setup lang="ts">
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
} from 'lucide-vue-next';

defineEmits<{
  (e: 'format', type: string): void;
}>();
</script>

<template>
  <div class="editor-toolbar">
    <button
      type="button"
      class="toolbar-btn"
      title="Bold (Ctrl+B)"
      aria-label="Bold"
      @click="$emit('format', 'bold')"
    >
      <Bold :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Italic (Ctrl+I)"
      aria-label="Italic"
      @click="$emit('format', 'italic')"
    >
      <Italic :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Strikethrough"
      aria-label="Strikethrough"
      @click="$emit('format', 'strikethrough')"
    >
      <Strikethrough :size="15" />
    </button>

    <span class="toolbar-divider"></span>

    <button
      type="button"
      class="toolbar-btn"
      title="Heading 1"
      aria-label="Heading 1"
      @click="$emit('format', 'h1')"
    >
      <Heading1 :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Heading 2"
      aria-label="Heading 2"
      @click="$emit('format', 'h2')"
    >
      <Heading2 :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Heading 3"
      aria-label="Heading 3"
      @click="$emit('format', 'h3')"
    >
      <Heading3 :size="15" />
    </button>

    <span class="toolbar-divider"></span>

    <button
      type="button"
      class="toolbar-btn"
      title="Code Block"
      aria-label="Code block"
      @click="$emit('format', 'code')"
    >
      <Code :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Insert Link"
      aria-label="Insert link"
      @click="$emit('format', 'link')"
    >
      <Link :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Bullet List"
      aria-label="Bullet list"
      @click="$emit('format', 'bullet-list')"
    >
      <List :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Task List"
      aria-label="Task list"
      @click="$emit('format', 'task-list')"
    >
      <ListTodo :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Quote"
      aria-label="Quote"
      @click="$emit('format', 'blockquote')"
    >
      <Quote :size="15" />
    </button>
    <button
      type="button"
      class="toolbar-btn"
      title="Insert Table"
      aria-label="Insert table"
      @click="$emit('format', 'table')"
    >
      <Table :size="15" />
    </button>
  </div>
</template>

<style scoped>
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
</style>
