<template>
  <aside class="note-sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <FileText class="icon-brand" :size="20" />
        <h2>All Notes</h2>
        <span class="notes-count-badge">{{ notes.length }}</span>
      </div>

      <div class="sidebar-header-actions">
        <!-- Export All Dropdown -->
        <div ref="exportMenuRef" class="export-all-wrapper">
          <button
            type="button"
            class="btn-icon btn-export-all"
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

        <button class="btn btn-primary btn-new-note" @click="handleCreateNote" title="Create New Note (Ctrl+N)">
          <Plus :size="16" />
          <span>New Note</span>
        </button>
      </div>
    </div>

    <!-- Search & Filter Area -->
    <div class="sidebar-search-area">
      <div class="search-box">
        <Search class="search-icon" :size="15" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search notes or tags..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          class="btn-clear-search"
          @click="searchQuery = ''"
          title="Clear search"
        >
          <X :size="14" />
        </button>
      </div>

      <!-- Tag Filter Chips -->
      <div v-if="allTags.length > 0" class="tags-filter-scroll">
        <button
          class="tag-filter-pill"
          :class="{ active: selectedTag === null }"
          @click="selectedTag = null"
        >
          All
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="tag-filter-pill"
          :class="{ active: selectedTag === tag }"
          @click="toggleTagFilter(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <!-- Notes List -->
    <div class="sidebar-list">
      <div v-if="isLoading && notes.length === 0" class="sidebar-state-message">
        <div class="spinner"></div>
        <span>Loading notes...</span>
      </div>

      <div v-else-if="filteredNotes.length === 0" class="sidebar-state-message">
        <p v-if="searchQuery || selectedTag">No matching notes found</p>
        <p v-else>No notes yet. Create your first note!</p>
        <button class="btn btn-secondary btn-sm mt-2" @click="handleCreateNote">
          <Plus :size="14" /> Create Note
        </button>
      </div>

      <div
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-list-item"
        :class="{ active: selectedNoteId === note.id }"
        @click="openNote(note.id)"
      >
        <div class="note-item-main">
          <div class="note-item-header">
            <h3 class="note-item-title">{{ note.title || 'Untitled Note' }}</h3>
            <button
              class="btn-icon btn-icon-danger btn-delete-note"
              @click.stop="handleDeleteNote(note.id, note.title)"
              title="Delete Note"
              aria-label="Delete Note"
            >
              <Trash2 :size="15" />
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
                v-for="t in note.tags.slice(0, 3)"
                :key="t"
                class="tag-chip"
              >
                #{{ t }}
              </span>
              <span v-if="note.tags.length > 3" class="tag-chip-more">
                +{{ note.tags.length - 3 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  FileText,
  Plus,
  Search,
  X,
  Trash2,
  Calendar,
  Download,
  Braces,
} from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';
import { useConfirm } from '../composables/useConfirm';
import { exportNoteJson, exportCombinedMarkdown, downloadBlob } from '../utils/export';

const {
  notes,
  selectedNoteId,
  searchQuery,
  selectedTag,
  allTags,
  filteredNotes,
  isLoading,
  isSidebarOpen,
  openNote,
  createNote,
  deleteNote,
  toggleTagFilter,
  flushAutoSave,
} = useNotes();

const { confirm } = useConfirm();

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

async function handleCreateNote() {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
  });
}

async function handleDeleteNote(id: string, title: string) {
  const confirmed = await confirm({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This action cannot be undone.',
    itemTitle: title || 'Untitled Note',
    variant: 'danger',
    confirmText: 'Delete Note',
    cancelText: 'Cancel',
  });

  if (confirmed) {
    await deleteNote(id);
  }
}

function getPreviewSnippet(content: string): string {
  if (!content) return 'No additional text';
  // Strip common markdown markers for a clean snippet
  const clean = content
    .replace(/^#+\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();

  const firstLine = clean.split('\n').filter((l) => l.trim().length > 0)[0] || '';
  return firstLine.slice(0, 80) + (firstLine.length > 80 ? '...' : '') || 'Empty note';
}

function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
</script>

<style scoped>
.note-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, width 0.25s ease;
  z-index: 10;
}

.sidebar-header {
  padding: 1rem 1.15rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-brand h2 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.icon-brand {
  color: var(--accent-primary);
}

.notes-count-badge {
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  border: 1px solid var(--border-subtle);
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.export-all-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-export-all {
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  padding: 0.35rem;
}

.btn-export-all:hover,
.btn-export-all.active {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.export-all-menu {
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

.btn-new-note {
  font-size: 0.78rem;
  padding: 0.35rem 0.7rem;
}

.sidebar-search-area {
  padding: 0.75rem 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-bottom: 1px solid var(--border-color);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.45rem 1.8rem 0.45rem 2.1rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px var(--border-subtle);
}

.btn-clear-search {
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 50%;
}

.btn-clear-search:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

.tags-filter-scroll {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tags-filter-scroll::-webkit-scrollbar {
  display: none;
}

.tag-filter-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tag-filter-pill:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.tag-filter-pill.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-inverse);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  -webkit-overflow-scrolling: touch;
}

.sidebar-state-message {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.825rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.note-list-item {
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-md);
  background-color: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.note-list-item:hover {
  background-color: var(--bg-surface);
}

.note-list-item.active {
  background-color: var(--bg-surface-active);
  border-color: var(--border-focus);
}

.note-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.note-item-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.btn-delete-note {
  opacity: 0;
  padding: 0.3rem;
  border-radius: var(--radius-sm);
  transition: opacity 0.15s ease;
}

.note-list-item:hover .btn-delete-note {
  opacity: 1;
}

@media (hover: none) {
  .btn-delete-note {
    opacity: 0.85;
  }
}

.note-item-preview {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.45rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.note-item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.note-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
}

.note-tags-list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
}

.tag-chip {
  background: var(--bg-surface);
  color: var(--accent-primary);
  border: 1px solid var(--border-subtle);
  font-size: 0.65rem;
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.tag-chip-more {
  font-size: 0.65rem;
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .note-sidebar {
    width: 100%;
    min-width: 100%;
    border-right: none;
    flex: 1;
  }

  .btn-delete-note {
    opacity: 0.85;
    padding: 0.4rem;
  }

  .note-list-item {
    padding: 0.85rem 1rem;
  }
}
</style>
