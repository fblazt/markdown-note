<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Plus, FolderPlus, Download, Braces, FileText } from 'lucide-vue-next';
import { useNotes } from '../../composables/useNotes';
import { exportNoteJson, exportCombinedMarkdown, downloadBlob } from '../../utils/export';

defineEmits<{
  (e: 'create-note'): void;
  (e: 'start-create-folder'): void;
}>();

const { notes, flushAutoSave } = useNotes();

const isExportOpen = ref(false);
const exportMenuRef = ref<HTMLElement | null>(null);

function toggleExportMenu(e: MouseEvent) {
  e.stopPropagation();
  isExportOpen.value = !isExportOpen.value;
}

function handleExportAll(type: 'json' | 'md') {
  flushAutoSave();
  isExportOpen.value = false;

  if (type === 'json') {
    const content = exportNoteJson(notes.value);
    downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
  } else if (type === 'md') {
    const content = exportCombinedMarkdown(notes.value);
    downloadBlob(content, 'notes-digest.md', 'text/markdown;charset=utf-8');
  }
}

function handleClickOutside(event: MouseEvent) {
  if (exportMenuRef.value && !exportMenuRef.value.contains(event.target as Node)) {
    isExportOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isExportOpen.value) {
    isExportOpen.value = false;
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
  <div class="sidebar-header">
    <div class="sidebar-title-group">
      <h2>Explorer</h2>
    </div>

    <div class="sidebar-header-actions">
      <!-- New Note Button -->
      <button
        type="button"
        class="btn-icon btn-sidebar-action btn-sidebar-new-note"
        title="New Note (Ctrl+N)"
        aria-label="New Note"
        @click="$emit('create-note')"
      >
        <Plus :size="15" />
      </button>

      <!-- New Folder Button -->
      <button
        type="button"
        class="btn-icon btn-sidebar-action btn-new-folder"
        title="Create New Folder"
        aria-label="Create New Folder"
        @click="$emit('start-create-folder')"
      >
        <FolderPlus :size="15" />
      </button>

      <!-- Export All Dropdown -->
      <div ref="exportMenuRef" class="export-all-wrapper">
        <button
          type="button"
          class="btn-icon btn-sidebar-action btn-export-all"
          :class="{ active: isExportOpen }"
          title="Export all notes"
          aria-label="Export all notes"
          aria-haspopup="true"
          :aria-expanded="isExportOpen"
          @click="toggleExportMenu"
        >
          <Download :size="15" />
        </button>

        <transition name="dropdown-fade">
          <div
            v-if="isExportOpen"
            class="export-all-menu"
            role="menu"
            aria-orientation="vertical"
            @keydown.escape="isExportOpen = false"
          >
            <div class="menu-header">
              <span>Export All ({{ notes.length }})</span>
            </div>

            <button
              type="button"
              class="menu-item"
              role="menuitem"
              @click="handleExportAll('json')"
            >
              <Braces :size="15" class="item-icon-json" />
              <div class="item-content">
                <span class="item-title">JSON Backup</span>
                <span class="item-subtitle">Full backup (.json)</span>
              </div>
            </button>

            <button
              type="button"
              class="menu-item"
              role="menuitem"
              @click="handleExportAll('md')"
            >
              <FileText :size="15" class="item-icon-md" />
              <div class="item-content">
                <span class="item-title">Markdown Digest</span>
                <span class="item-subtitle">Combined doc with TOC (.md)</span>
              </div>
            </button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-header {
  padding: 0.85rem 0.85rem 0.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-sidebar);
}

.sidebar-title-group h2 {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.btn-sidebar-action {
  color: var(--text-secondary);
  padding: 0.3rem;
  border-radius: var(--radius-sm);
}

.btn-sidebar-action:hover,
.btn-sidebar-action.active {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

.btn-sidebar-new-note {
  color: var(--accent-primary);
}

.export-all-wrapper {
  position: relative;
}

.export-all-menu {
  position: absolute;
  top: calc(100% + 4px);
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

.item-icon-json {
  color: var(--accent-warning);
  flex-shrink: 0;
}

.item-icon-md {
  color: var(--accent-primary);
  flex-shrink: 0;
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
