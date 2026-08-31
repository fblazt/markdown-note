<script setup lang="ts">
import { Trash2, Calendar } from 'lucide-vue-next';
import type { Note } from '../../../shared/types/note';
import { getPreviewSnippet, formatDate } from '../../utils/markdown';

withDefaults(
  defineProps<{
    note: Note;
    isSelected?: boolean;
    isDragging?: boolean;
  }>(),
  {
    isSelected: false,
    isDragging: false,
  }
);

defineEmits<{
  (e: 'open', noteId: string): void;
  (e: 'delete', noteId: string, title: string): void;
  (e: 'dragstart', event: DragEvent, note: Note): void;
  (e: 'dragend', event: DragEvent): void;
}>();
</script>

<template>
  <div
    class="note-list-item folder-note-item"
    :class="{
      active: isSelected,
      'is-dragging': isDragging,
    }"
    draggable="true"
    @dragstart="$emit('dragstart', $event, note)"
    @dragend="$emit('dragend', $event)"
    @click="$emit('open', note.id)"
  >
    <div class="note-item-main">
      <div class="note-item-header">
        <h3 class="note-item-title">{{ note.title || 'Untitled Note' }}</h3>
        <button
          type="button"
          class="btn-icon btn-icon-danger btn-delete-note"
          title="Delete Note"
          aria-label="Delete Note"
          @click.stop="$emit('delete', note.id, note.title)"
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
</template>

<style scoped>
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

.folder-note-item.is-dragging {
  opacity: 0.4 !important;
  cursor: grabbing !important;
}

.note-item-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
</style>
