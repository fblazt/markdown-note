<template>
  <div class="app-container">
    <!-- App Header -->
    <header class="app-header">
      <div class="header-left">
        <button
          class="btn-icon header-toggle-sidebar"
          @click="toggleSidebar"
          :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
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
          :class="{ active: viewMode === 'editor' }"
          @click="setViewMode('editor')"
          title="Editor Only"
        >
          <PenLine :size="15" />
          <span class="btn-label">Editor</span>
        </button>

        <button
          class="view-mode-btn"
          :class="{ active: viewMode === 'split' }"
          @click="setViewMode('split')"
          title="Split View (Editor + Preview)"
        >
          <Columns2 :size="15" />
          <span class="btn-label">Split</span>
        </button>

        <button
          class="view-mode-btn"
          :class="{ active: viewMode === 'preview' }"
          @click="setViewMode('preview')"
          title="Preview Only"
        >
          <Eye :size="15" />
          <span class="btn-label">Preview</span>
        </button>
      </div>

      <div class="header-right">
        <button class="btn btn-primary btn-sm" @click="handleCreateNote">
          <Plus :size="15" />
          <span>New Note</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main class="app-main">
      <!-- Sidebar Pane -->
      <NoteSidebar />

      <!-- Editor Pane -->
      <NoteEditor v-show="viewMode === 'split' || viewMode === 'editor'" />

      <!-- Preview Pane -->
      <NotePreview v-show="viewMode === 'split' || viewMode === 'preview'" />
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
} from 'lucide-vue-next';
import { useNotes } from './composables/useNotes';
import NoteSidebar from './components/NoteSidebar.vue';
import NoteEditor from './components/NoteEditor.vue';
import NotePreview from './components/NotePreview.vue';

const {
  notes,
  activeNote,
  viewMode,
  isSidebarOpen,
  fetchNotes,
  createNote,
  setViewMode,
  toggleSidebar,
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
  gap: 0.85rem;
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
}

@media (max-width: 768px) {
  .btn-label {
    display: none;
  }
  .status-tip {
    display: none;
  }
}
</style>
