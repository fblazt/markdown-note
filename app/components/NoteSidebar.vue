<template>
  <aside class="note-sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <FileText class="icon-brand" :size="20" />
        <h2>All Notes</h2>
        <span class="notes-count-badge">{{ notes.length }}</span>
      </div>

      <button class="btn btn-primary btn-new-note" @click="handleCreateNote" title="Create New Note (Ctrl+N)">
        <Plus :size="16" />
        <span>New Note</span>
      </button>
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
import {
  FileText,
  Plus,
  Search,
  X,
  Trash2,
  Calendar,
} from 'lucide-vue-next';
import { useNotes } from '../composables/useNotes';

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
} = useNotes();

async function handleCreateNote() {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
  });
}

async function handleDeleteNote(id: string, title: string) {
  if (confirm(`Are you sure you want to delete "${title || 'Untitled Note'}"?`)) {
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
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
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
  color: #ffffff;
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
  border-color: rgba(99, 102, 241, 0.4);
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
  background: rgba(99, 102, 241, 0.12);
  color: #a5b4fc;
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
