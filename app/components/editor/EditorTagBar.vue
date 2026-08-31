<script setup lang="ts">
import { ref } from 'vue';
import { Tag, X } from 'lucide-vue-next';
import type { Note } from '../../../shared/types/note';
import { useNotes } from '../../composables/useNotes';

const props = defineProps<{
  activeNote: Note;
}>();

const { queueAutoSave } = useNotes();
const newTagInput = ref('');

function addTag() {
  const tag = newTagInput.value.trim().replace(/^#/, '');
  if (!tag || !props.activeNote) return;

  const currentTags = Array.isArray(props.activeNote.tags) ? [...props.activeNote.tags] : [];
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    queueAutoSave({ tags: currentTags });
  }
  newTagInput.value = '';
}

function removeTag(index: number) {
  if (!props.activeNote) return;
  const currentTags = Array.isArray(props.activeNote.tags) ? [...props.activeNote.tags] : [];
  currentTags.splice(index, 1);
  queueAutoSave({ tags: currentTags });
}

function handleTagBackspace() {
  if (!newTagInput.value && props.activeNote && props.activeNote.tags?.length) {
    removeTag(props.activeNote.tags.length - 1);
  }
}
</script>

<template>
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
          type="button"
          class="btn-remove-tag"
          title="Remove tag"
          aria-label="Remove tag"
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
</template>

<style scoped>
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

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  color: var(--accent-primary);
  font-weight: 500;
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
</style>
