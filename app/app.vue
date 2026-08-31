<template>
  <!-- Startup Loading Screen -->
  <div v-if="isInitializing" class="app-loading-screen">
    <div class="loading-spinner-wrapper">
      <Loader2 :size="36" class="loading-spinner" />
      <span class="loading-label">Loading Markdown Notes...</span>
    </div>
  </div>

  <!-- Authentication Gate -->
  <AuthGate v-else-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <!-- Main Workspace -->
  <div v-else class="app-container">
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
          :class="{ 'sidebar-is-closed': !isSidebarOpen }"
          @click="toggleSidebar"
          :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
          aria-label="Toggle sidebar"
          :aria-expanded="isSidebarOpen"
        >
          <PanelLeft :size="18" class="sidebar-toggle-icon" />
        </button>

        <div class="brand">
          <span class="brand-name">Markdown Notes</span>
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
        <ThemeToggle />
        <button
          class="btn-icon header-profile-btn"
          @click="isProfileOpen = true"
          title="Account Settings"
          aria-label="Account Settings"
        >
          <User :size="16" />
        </button>
        <button class="btn btn-primary btn-header-new" @click="handleCreateNote" title="New Note (Ctrl+N)">
          <Plus :size="15" />
          <span class="new-note-label">New Note</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <main
      class="app-main"
      :class="[
        `view-${effectiveViewMode}`,
        {
          'is-mobile': isMobile,
          'sidebar-is-open': isSidebarOpen,
        },
      ]"
    >
      <!-- Sidebar Pane (List View) -->
      <NoteSidebar />

      <!-- Workspace Area with Alert Banner & Panels -->
      <div class="workspace-area">
        <StorageAlertBanner />

        <div class="workspace-panels">
          <!-- Editor Panel -->
          <div
            class="panel-container panel-editor"
            :class="{
              'panel-active': isEditorActive,
              'panel-collapsed': !isEditorActive,
            }"
            :aria-hidden="!isEditorActive"
          >
            <NoteEditor />
          </div>

          <!-- Preview Panel -->
          <div
            class="panel-container panel-preview"
            :class="{
              'panel-active': isPreviewActive,
              'panel-collapsed': !isPreviewActive,
            }"
            :aria-hidden="!isPreviewActive"
          >
            <NotePreview />
          </div>
        </div>
      </div>
    </main>

    <!-- Footer / Status Bar -->
    <footer class="status-bar">
      <div class="status-right">
        <SyncStatusBadge />
        <span class="status-separator status-sync-separator">•</span>

        <template v-if="activeNote">
          <span class="status-stat">{{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}</span>
          <span class="status-separator status-stat-extra">•</span>
          <span class="status-stat status-stat-extra">{{ charCount }} {{ charCount === 1 ? 'char' : 'chars' }}</span>
          <span class="status-separator status-stat-extra">•</span>
          <span class="status-stat status-stat-extra">~{{ readingTime }} min read</span>
          <span class="status-separator">•</span>
        </template>

        <template v-if="quotaInfo.isSupported">
          <span
            class="status-storage-summary"
            :class="`status-quota-${quotaInfo.status}`"
          >
            <HardDrive :size="12" />
            <span>{{ quotaInfo.formattedUsage }} / {{ quotaInfo.formattedQuota }} ({{ Math.round(quotaInfo.percentage) }}%)</span>
          </span>
          <span class="status-separator status-storage-separator">•</span>
        </template>

        <span class="status-notes-total">{{ notes.length }} notes</span>
      </div>
    </footer>

    <!-- Global Confirmation Dialog Modal -->
    <ConfirmDialog />

    <!-- User Profile & Account Settings Modal -->
    <ProfileModal v-if="isProfileOpen" @close="isProfileOpen = false" />

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  PanelLeft,
  Columns2,
  PenLine,
  Eye,
  Plus,
  ChevronLeft,
  HardDrive,
  Loader2,
  User,
} from 'lucide-vue-next';
import { useAuth } from './composables/useAuth';
import { useNotes } from './composables/useNotes';
import { useTheme } from './composables/useTheme';
import { useStorageQuota } from './composables/useStorageQuota';
import { useSync } from './composables/useSync';
import { getWordCount, getCharCount, getReadingTime } from './utils/markdown';
import AuthGate from './components/AuthGate.vue';
import NoteSidebar from './components/NoteSidebar.vue';
import NoteEditor from './components/NoteEditor.vue';
import NotePreview from './components/NotePreview.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastContainer from './components/ToastContainer.vue';
import StorageAlertBanner from './components/StorageAlertBanner.vue';
import ProfileModal from './components/ProfileModal.vue';
import SyncStatusBadge from './components/SyncStatusBadge.vue';

const isProfileOpen = ref(false);

const {
  isAuthenticated,
  isInitializing,
  initAuth,
} = useAuth();

const {
  notes,
  activeNote,
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

const { quotaInfo } = useStorageQuota();
const { initTheme } = useTheme();
const { initSSE, closeSSE } = useSync();

const isEditorActive = computed(() => {
  if (isMobile.value) {
    return !isSidebarOpen.value && effectiveViewMode.value === 'editor';
  }
  return effectiveViewMode.value === 'split' || effectiveViewMode.value === 'editor';
});

const isPreviewActive = computed(() => {
  if (isMobile.value) {
    return !isSidebarOpen.value && effectiveViewMode.value === 'preview';
  }
  return effectiveViewMode.value === 'split' || effectiveViewMode.value === 'preview';
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

async function handleAuthenticated() {
  await fetchNotes();
  initSSE();
}

async function handleCreateNote() {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
  });
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (!isAuthenticated.value) return;
  // Ctrl+N or Cmd+N: create new note
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
    e.preventDefault();
    handleCreateNote();
  }
}

watch(isAuthenticated, (authed) => {
  if (!authed) {
    closeSSE();
  }
});

onMounted(async () => {
  initTheme();
  checkMobile();
  await initAuth();
  if (isAuthenticated.value) {
    await fetchNotes();
    initSSE();
  }
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  closeSSE();
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.app-loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  background-color: var(--bg-app);
  color: var(--text-primary);
}

.loading-spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  color: var(--accent-primary);
  animation: loading-spin 1s linear infinite;
}

.loading-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

@keyframes loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

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
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mobile-back-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-focus);
}

.mobile-back-text {
  font-size: 0.85rem;
  font-weight: 600;
}

.header-toggle-sidebar {
  transition: background-color 0.15s ease, transform 0.15s ease, color 0.15s ease;
}

.sidebar-toggle-icon {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

.header-toggle-sidebar.sidebar-is-closed .sidebar-toggle-icon {
  opacity: 0.75;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
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
  transition: color 0.2s ease, background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, transform 0.15s ease;
}

.view-mode-btn:hover {
  color: var(--text-primary);
}

.view-mode-btn.active {
  background-color: var(--bg-app);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-separator {
  color: var(--border-subtle);
  font-size: 0.65rem;
  user-select: none;
}

.status-stat {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.72rem;
  white-space: nowrap;
}

.status-notes-total {
  font-weight: 500;
  font-size: 0.72rem;
  white-space: nowrap;
}

.status-storage-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.status-quota-warning {
  color: var(--accent-warning);
}

.status-quota-critical,
.status-quota-exceeded {
  color: var(--accent-danger);
}

/* Workspace Area, Panels & Transition Layout */
.workspace-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.workspace-panels {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.panel-container {
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  will-change: flex-grow, flex-basis, max-width, opacity, transform;
  transition:
    flex-grow 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    flex-basis 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.22s ease,
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

/* View: Editor Only */
.view-editor .panel-editor {
  flex: 1 1 100%;
  max-width: 100%;
  opacity: 1;
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

.view-editor .panel-preview {
  flex: 0 0 0%;
  max-width: 0%;
  opacity: 0;
  transform: translateX(24px);
  visibility: hidden;
  pointer-events: none;
}

/* View: Split */
.view-split .panel-editor {
  flex: 1 1 50%;
  max-width: 50%;
  opacity: 1;
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

.view-split .panel-preview {
  flex: 1 1 50%;
  max-width: 50%;
  opacity: 1;
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

/* View: Preview Only */
.view-preview .panel-editor {
  flex: 0 0 0%;
  max-width: 0%;
  opacity: 0;
  transform: translateX(-24px);
  visibility: hidden;
  pointer-events: none;
}

.view-preview .panel-preview {
  flex: 1 1 100%;
  max-width: 100%;
  opacity: 1;
  transform: translateX(0);
  visibility: visible;
  pointer-events: auto;
}

@media (max-width: 767px) {
  .btn-label {
    display: none;
  }
  .split-view-btn {
    display: none !important;
  }
  .brand-name {
    font-size: 0.9rem;
  }
  .header-toggle-sidebar {
    display: none;
  }
  .status-bar {
    justify-content: flex-end;
  }
  .status-storage-summary,
  .status-storage-separator {
    display: none !important;
  }
  .status-stat-extra {
    display: none !important;
  }
  .new-note-label {
    display: none;
  }
  .btn-header-new {
    min-width: 40px;
    padding: 0.45rem 0.65rem;
  }

  .workspace-area {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .workspace-panels {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .panel-container {
    position: absolute;
    inset: 0;
    width: 100%;
    max-width: 100% !important;
    flex: none !important;
    transition:
      transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.22s ease,
      visibility 0.28s ease;
  }

  .view-editor .panel-editor {
    transform: translateX(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .view-editor .panel-preview {
    transform: translateX(100%);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .view-preview .panel-editor {
    transform: translateX(-100%);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .view-preview .panel-preview {
    transform: translateX(0);
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-toggle-sidebar,
  .sidebar-toggle-icon,
  .panel-container,
  .view-mode-btn {
    transition: none !important;
  }
}
</style>
