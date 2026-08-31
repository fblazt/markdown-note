<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Download,
  ChevronDown,
  FileText,
  FileCode,
  AlignLeft,
  Braces,
  Printer,
} from 'lucide-vue-next';
import type { Note } from '../../shared/types/note';
import { useNotes } from '../composables/useNotes';
import {
  sanitizeFilename,
  exportNoteMarkdown,
  exportNoteHtml,
  exportNotePlainText,
  exportNoteJson,
  downloadBlob,
  printNote,
} from '../utils/export';

const props = defineProps<{
  note: Note | null;
}>();

const { flushAutoSave } = useNotes();
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function toggleDropdown(e: MouseEvent) {
  e.stopPropagation();
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function handleExport(type: 'md' | 'html' | 'txt' | 'json' | 'print') {
  if (!props.note) return;

  // Flush any pending auto-save before exporting
  flushAutoSave();
  closeDropdown();

  const title = props.note.title || 'Untitled Note';

  switch (type) {
    case 'md': {
      const content = exportNoteMarkdown(props.note, { includeFrontmatter: true });
      const filename = sanitizeFilename(title, 'untitled-note', 'md');
      downloadBlob(content, filename, 'text/markdown;charset=utf-8');
      break;
    }
    case 'html': {
      const content = exportNoteHtml(props.note, { standalone: true });
      const filename = sanitizeFilename(title, 'untitled-note', 'html');
      downloadBlob(content, filename, 'text/html;charset=utf-8');
      break;
    }
    case 'txt': {
      const content = exportNotePlainText(props.note);
      const filename = sanitizeFilename(title, 'untitled-note', 'txt');
      downloadBlob(content, filename, 'text/plain;charset=utf-8');
      break;
    }
    case 'json': {
      const content = exportNoteJson(props.note);
      const filename = sanitizeFilename(title, 'untitled-note', 'json');
      downloadBlob(content, filename, 'application/json;charset=utf-8');
      break;
    }
    case 'print': {
      printNote(props.note);
      break;
    }
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown();
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<template>
  <div v-if="note" ref="dropdownRef" class="export-dropdown-wrapper">
    <!-- Trigger Button -->
    <button
      type="button"
      class="btn-action export-trigger-btn"
      :class="{ 'btn-active': isOpen }"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Export note options"
      title="Export note in various formats"
      @click="toggleDropdown"
      @keydown.escape="closeDropdown"
    >
      <Download :size="14" />
      <span class="btn-text">Export</span>
      <ChevronDown :size="12" class="chevron-icon" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown Menu -->
    <transition name="dropdown-fade">
      <div
        v-if="isOpen"
        class="export-menu"
        role="menu"
        aria-orientation="vertical"
        @keydown.escape="closeDropdown"
      >
        <div class="menu-header">
          <span>Export Note</span>
        </div>

        <button
          type="button"
          class="menu-item"
          role="menuitem"
          @click="handleExport('md')"
        >
          <FileText :size="15" class="item-icon item-icon-md" />
          <div class="item-content">
            <span class="item-title">Markdown</span>
            <span class="item-subtitle">.md file with frontmatter</span>
          </div>
        </button>

        <button
          type="button"
          class="menu-item"
          role="menuitem"
          @click="handleExport('html')"
        >
          <FileCode :size="15" class="item-icon item-icon-html" />
          <div class="item-content">
            <span class="item-title">HTML Document</span>
            <span class="item-subtitle">Standalone styled .html</span>
          </div>
        </button>

        <button
          type="button"
          class="menu-item"
          role="menuitem"
          @click="handleExport('txt')"
        >
          <AlignLeft :size="15" class="item-icon item-icon-txt" />
          <div class="item-content">
            <span class="item-title">Plain Text</span>
            <span class="item-subtitle">Stripped formatting .txt</span>
          </div>
        </button>

        <button
          type="button"
          class="menu-item"
          role="menuitem"
          @click="handleExport('json')"
        >
          <Braces :size="15" class="item-icon item-icon-json" />
          <div class="item-content">
            <span class="item-title">JSON Data</span>
            <span class="item-subtitle">Raw metadata & content</span>
          </div>
        </button>

        <div class="menu-divider"></div>

        <button
          type="button"
          class="menu-item menu-item-print"
          role="menuitem"
          @click="handleExport('print')"
        >
          <Printer :size="15" class="item-icon item-icon-print" />
          <div class="item-content">
            <span class="item-title">Print / PDF</span>
            <span class="item-subtitle">Format and send to printer</span>
          </div>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.export-dropdown-wrapper {
  position: relative;
  display: inline-flex;
}

.export-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.export-trigger-btn:hover,
.export-trigger-btn.btn-active {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

.export-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 220px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.35rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.menu-header {
  padding: 0.4rem 0.6rem 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
}

.menu-item:hover,
.menu-item:focus {
  background-color: var(--bg-surface-hover);
  outline: none;
}

.item-icon {
  flex-shrink: 0;
}

.item-icon-md {
  color: var(--accent-primary);
}

.item-icon-html {
  color: var(--accent-secondary);
}

.item-icon-txt {
  color: var(--text-secondary);
}

.item-icon-json {
  color: var(--accent-warning);
}

.item-icon-print {
  color: var(--accent-success);
}

.item-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
}

.item-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.menu-divider {
  height: 1px;
  background-color: var(--border-subtle);
  margin: 0.25rem 0;
}

/* Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 767px) {
  .export-trigger-btn {
    min-height: 38px;
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
  }

  .export-menu {
    width: 240px;
    right: 0;
  }

  .menu-item {
    min-height: 42px;
    padding: 0.5rem 0.75rem;
  }

  .item-title {
    font-size: 0.85rem;
  }

  .item-subtitle {
    font-size: 0.72rem;
  }
}
</style>
