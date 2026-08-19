<template>
  <div v-if="activeNote" class="note-preview">
    <!-- Preview Header & Actions -->
    <div class="preview-header">
      <div class="preview-title">
        <Eye :size="15" class="preview-icon" />
        <span>Preview</span>
      </div>

      <div class="preview-actions">
        <button
          class="btn-action"
          @click="copyMarkdown"
          :title="copiedMd ? 'Copied Markdown!' : 'Copy raw Markdown'"
        >
          <Check v-if="copiedMd" :size="14" class="text-success" />
          <Copy v-else :size="14" />
          <span>{{ copiedMd ? 'Copied MD' : 'Copy MD' }}</span>
        </button>

        <button
          class="btn-action"
          @click="copyHtml"
          :title="copiedHtml ? 'Copied HTML!' : 'Copy sanitized HTML'"
        >
          <Check v-if="copiedHtml" :size="14" class="text-success" />
          <Code v-else :size="14" />
          <span>{{ copiedHtml ? 'Copied HTML' : 'Copy HTML' }}</span>
        </button>
      </div>
    </div>

    <!-- Rendered Markdown Body -->
    <div class="preview-scroll-container">
      <div v-if="activeNote.content" class="markdown-body" v-html="renderedHtml"></div>
      <div v-else class="preview-empty">
        <p>No content to preview</p>
      </div>
    </div>

    <!-- Reading Stats Bar -->
    <div class="preview-stats-bar">
      <span class="stat-item">
        <strong>{{ wordCount }}</strong> words
      </span>
      <span class="stat-divider">•</span>
      <span class="stat-item">
        <strong>{{ charCount }}</strong> characters
      </span>
      <span class="stat-divider">•</span>
      <span class="stat-item">
        <strong>~{{ readingTime }}</strong> min read
      </span>
    </div>
  </div>

  <div v-else class="preview-empty-state">
    <p>Select a note to preview</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Eye, Copy, Check, Code } from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { parseMarkdown, getWordCount, getCharCount, getReadingTime } from '../utils/markdown';

const { activeNote } = useNotes();

const copiedMd = ref(false);
const copiedHtml = ref(false);

const renderedHtml = computed(() => {
  if (!activeNote.value || !activeNote.value.content) return '';
  return parseMarkdown(activeNote.value.content);
});

const wordCount = computed(() => {
  return activeNote.value ? getWordCount(activeNote.value.content) : 0;
});

const charCount = computed(() => {
  return activeNote.value ? getCharCount(activeNote.value.content) : 0;
});

const readingTime = computed(() => {
  return activeNote.value ? getReadingTime(activeNote.value.content) : 0;
});

async function copyMarkdown() {
  if (!activeNote.value) return;
  try {
    await navigator.clipboard.writeText(activeNote.value.content);
    copiedMd.value = true;
    setTimeout(() => {
      copiedMd.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy markdown:', err);
  }
}

async function copyHtml() {
  if (!renderedHtml.value) return;
  try {
    await navigator.clipboard.writeText(renderedHtml.value);
    copiedHtml.value = true;
    setTimeout(() => {
      copiedHtml.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy HTML:', err);
  }
}
</script>

<style scoped>
.note-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-app);
  flex: 1;
  min-width: 0;
}

.preview-header {
  height: 44px;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-app);
  flex-shrink: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-icon {
  color: var(--accent-primary);
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.text-success {
  color: var(--accent-success);
}

.preview-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  min-height: 0;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.9rem;
}

.preview-stats-bar {
  padding: 0.4rem 1.25rem;
  background-color: var(--bg-sidebar);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.stat-item strong {
  color: var(--text-secondary);
}

.stat-divider {
  color: var(--border-subtle);
}

.preview-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
</style>
