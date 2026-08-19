<template>
  <div class="app-container">
    <!-- App Header -->
    <header class="app-header">
      <div class="header-left">
        <!-- Back button on mobile when note is open and sidebar is closed -->
        <button
          v-if="isMobile && !isSidebarOpen"
          class="btn-icon mobile-back-btn"
          @click="navigateBackToList"
          title="Back to notes list"
          aria-label="Back to notes list"
        >
          <ChevronLeft :size="18" />
          <span class="mobile-back-text">Notes</span>
        </button>

        <!-- Sidebar toggle on desktop or when sidebar is open -->
        <button
          v-else
          class="btn-icon header-toggle-sidebar"
          @click="toggleSidebar"
          :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
          aria-label="Toggle sidebar"
        >
          <PanelLeft :size="18" />
        </button>

        <div class="brand">
          <FileCode :size="20" class="brand-icon" />
          <span class="brand-name">Markdown Notes</span>
          <span class="brand-version">v1.0</span>
        </div>
      </div>

      <!-- View Mode Switcher -->
      <div class="view-mode-controls">
        <button
          class="view-mode-btn"
          :class="{ active: effectiveViewMode === 'editor' }"
          @click="setViewMode('editor')"
          title="Editor Only"
          aria-label="Editor view"
        >
          <PenLine :size="15" />
          <span class="btn-label">Editor</span>
        </button>

        <button
          class="view-mode-btn split-view-btn"
          :class="{ active: effectiveViewMode === 'split' }"
          @click="setViewMode('split')"
          title="Split View (Editor + Preview)"
          aria-label="Split view"
        >
          <Columns2 :size="15" />
          <span class="btn-label">Split</span>
        </button>

        <button
          class="view-mode-btn"
          :class="{ active: effectiveViewMode === 'preview' }"
          @click="setViewMode('preview')"
          title="Preview Only"
          aria-label="Preview view"
        >
          <Eye :size="15" />
          <span class="btn-label">Preview</span>
        </button>
      </div>

      <div class="header-right">
        <button class="btn btn-primary btn-header-new" @click="handleCreateNote" title="New Note (Ctrl+N)">
          <Plus :size="15" />
          <span class="new-note-label">New Note</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="app-main" :class="{ 'is-mobile': isMobile }">
      <!-- Sidebar Pane (List View) -->
      <NoteSidebar v-show="isSidebarOpen" />

      <!-- Editor Pane -->
      <NoteEditor
        v-show="(!isMobile && (effectiveViewMode === 'split' || effectiveViewMode === 'editor')) || (isMobile && !isSidebarOpen && effectiveViewMode === 'editor')"
      />

      <!-- Preview Pane -->
      <NotePreview
        v-show="(!isMobile && (effectiveViewMode === 'split' || effectiveViewMode === 'preview')) || (isMobile && !isSidebarOpen && effectiveViewMode === 'preview')"
      />
    </main>

    <!-- Footer / Status Bar -->
    <footer class="status-bar">
      <div class="status-left">
        <span v-if="activeNote" class="status-active-note">
          Editing: <strong>{{ activeNote.title || 'Untitled Note' }}</strong>
        </span>
        <span v-else>No note selected</span>
      </div>

      <div class="status-right">
        <span class="status-tip">
          <kbd>Ctrl+S</kbd> Save • <kbd>Ctrl+B</kbd> Bold • <kbd>Tab</kbd> Indent
        </span>
        <span class="status-notes-total">{{ notes.length }} notes</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import {
  FileCode,
  PanelLeft,
  Columns2,
  PenLine,
  Eye,
  Plus,
  ChevronLeft,
} from 'lucide-vue-next';
import { useNotes } from './composables/useNotes';
import NoteSidebar from './components/NoteSidebar.vue';
import NoteEditor from './components/NoteEditor.vue';
import NotePreview from './components/NotePreview.vue';

const {
  notes,
  activeNote,
  viewMode,
  effectiveViewMode,
  isSidebarOpen,
  isMobile,
  fetchNotes,
  createNote,
  setViewMode,
  toggleSidebar,
  navigateBackToList,
  checkMobile,
} = useNotes();

async function handleCreateNote() {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
  });
}

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl+N or Cmd+N: create new note
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
    e.preventDefault();
    handleCreateNote();
  }
}

onMounted(async () => {
  checkMobile();
  await fetchNotes();
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.mobile-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.35rem 0.6rem;
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 0.875rem;
  background: rgba(99, 102, 241, 0.12);
  border-radius: var(--radius-md);
  border: 1px solid rgba(99, 102, 241, 0.25);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-back-btn:hover {
  background: rgba(99, 102, 241, 0.2);
}

.mobile-back-text {
  font-size: 0.85rem;
  font-weight: 600;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-icon {
  color: var(--accent-primary);
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.brand-version {
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.view-mode-controls {
  display: flex;
  align-items: center;
  background-color: var(--bg-surface);
  padding: 0.2rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.view-mode-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-mode-btn:hover {
  color: var(--text-primary);
}

.view-mode-btn.active {
  background-color: var(--bg-app);
  color: #ffffff;
  box-shadow: var(--shadow-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-active-note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

.status-active-note strong {
  color: var(--text-secondary);
}

.status-tip {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.status-tip kbd {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-secondary);
}

.status-notes-total {
  font-weight: 500;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .btn-label {
    display: none;
  }
  .status-tip {
    display: none;
  }
  .split-view-btn {
    display: none !important;
  }
  .brand-version {
    display: none;
  }
  .brand-name {
    font-size: 0.9rem;
  }
  .header-toggle-sidebar {
    display: none;
  }
  .status-active-note {
    max-width: 180px;
  }
  .new-note-label {
    display: none;
  }
  .btn-header-new {
    min-width: 40px;
    padding: 0.45rem 0.65rem;
  }
}
</style>
