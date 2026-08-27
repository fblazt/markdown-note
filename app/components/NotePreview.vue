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
          aria-label="Copy raw Markdown"
        >
          <Check v-if="copiedMd" :size="14" class="text-success" />
          <Copy v-else :size="14" />
          <span>{{ copiedMd ? 'Copied MD' : 'Copy MD' }}</span>
        </button>

        <button
          class="btn-action"
          @click="copyHtml"
          :title="copiedHtml ? 'Copied HTML!' : 'Copy sanitized HTML'"
          aria-label="Copy sanitized HTML"
        >
          <Check v-if="copiedHtml" :size="14" class="text-success" />
          <Code v-else :size="14" />
          <span>{{ copiedHtml ? 'Copied HTML' : 'Copy HTML' }}</span>
        </button>

        <ExportDropdown :note="activeNote" />
      </div>
    </div>

    <!-- Rendered Markdown Body -->
    <div class="preview-scroll-container">
      <div v-if="activeNote.content" class="markdown-body" v-html="renderedHtml"></div>
      <div v-else class="preview-empty">
        <p>No content to preview</p>
      </div>
    </div>
  </div>

  <div v-else class="preview-empty-state">
    <p>Select a note to preview</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { Eye, Copy, Check, Code } from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { useTheme } from '../composables/useTheme';
import { parseMarkdown, escapeHtml } from '../utils/markdown';
import { renderMermaidDiagram } from '../utils/mermaid';
import ExportDropdown from './ExportDropdown.vue';

const { activeNote } = useNotes();
const { resolvedTheme } = useTheme();

const copiedMd = ref(false);
const copiedHtml = ref(false);

const renderedHtml = computed(() => {
  if (!activeNote.value || !activeNote.value.content) return '';
  return parseMarkdown(activeNote.value.content);
});

async function renderAllDiagrams() {
  if (typeof document === 'undefined') return;
  const container = document.querySelector('.markdown-body');
  if (!container) return;

  const diagramElements = container.querySelectorAll<HTMLElement>('.mermaid-diagram');
  if (diagramElements.length === 0) return;

  const isDark = resolvedTheme.value === 'dark';

  await Promise.all(
    Array.from(diagramElements).map(async (element, idx) => {
      const encodedCode = element.getAttribute('data-mermaid');
      if (!encodedCode) return;

      let rawCode = '';
      try {
        rawCode = decodeURIComponent(encodedCode);
      } catch {
        rawCode = encodedCode;
      }

      const id = `mermaid-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      const result = await renderMermaidDiagram(id, rawCode, isDark);

      if ('svg' in result && result.svg) {
        element.innerHTML = result.svg;
      } else if ('error' in result) {
        element.innerHTML = `<div class="mermaid-error"><div class="mermaid-error-title">Mermaid Syntax Error</div><pre class="mermaid-error-code"><code>${escapeHtml(rawCode)}</code></pre><div class="mermaid-error-msg">${escapeHtml(result.error)}</div></div>`;
      }
    })
  );
}

onMounted(() => {
  renderAllDiagrams();
});

watch(renderedHtml, () => {
  nextTick(renderAllDiagrams);
});

watch(resolvedTheme, () => {
  nextTick(renderAllDiagrams);
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
  -webkit-overflow-scrolling: touch;
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

.preview-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .preview-header {
    height: auto;
    min-height: 48px;
    padding: 0.5rem 1rem;
  }

  .btn-action {
    min-height: 38px;
    padding: 0.35rem 0.7rem;
    font-size: 0.8rem;
  }

  .preview-scroll-container {
    padding: 1rem 1.15rem;
  }
}
</style>
