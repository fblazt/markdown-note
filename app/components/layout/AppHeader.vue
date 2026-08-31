<script setup lang="ts">
import {
  PanelLeft,
  Columns2,
  PenLine,
  Eye,
  Plus,
  ChevronLeft,
  User,
} from 'lucide-vue-next';
import { useWorkspaceLayout } from '../../composables/useWorkspaceLayout';
import ThemeToggle from '../ThemeToggle.vue';

defineEmits<{
  (e: 'open-profile'): void;
  (e: 'create-note'): void;
}>();

const {
  effectiveViewMode,
  isSidebarOpen,
  isMobile,
  setViewMode,
  toggleSidebar,
  navigateBackToList,
} = useWorkspaceLayout();
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <!-- Back button on mobile when note is open and sidebar is closed -->
      <button
        v-if="isMobile && !isSidebarOpen"
        type="button"
        class="btn-icon mobile-back-btn"
        title="Back to notes list"
        aria-label="Back to notes list"
        @click="navigateBackToList"
      >
        <ChevronLeft :size="18" />
        <span class="mobile-back-text">Notes</span>
      </button>

      <!-- Sidebar toggle on desktop or when sidebar is open -->
      <button
        v-else
        type="button"
        class="btn-icon header-toggle-sidebar"
        :class="{ 'sidebar-is-closed': !isSidebarOpen }"
        :title="isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
        aria-label="Toggle sidebar"
        :aria-expanded="isSidebarOpen"
        @click="toggleSidebar"
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
        type="button"
        class="view-mode-btn"
        :class="{ active: effectiveViewMode === 'editor' }"
        title="Editor Only"
        aria-label="Editor view"
        @click="setViewMode('editor')"
      >
        <PenLine :size="15" />
        <span class="btn-label">Editor</span>
      </button>

      <button
        type="button"
        class="view-mode-btn split-view-btn"
        :class="{ active: effectiveViewMode === 'split' }"
        title="Split View (Editor + Preview)"
        aria-label="Split view"
        @click="setViewMode('split')"
      >
        <Columns2 :size="15" />
        <span class="btn-label">Split</span>
      </button>

      <button
        type="button"
        class="view-mode-btn"
        :class="{ active: effectiveViewMode === 'preview' }"
        title="Preview Only"
        aria-label="Preview view"
        @click="setViewMode('preview')"
      >
        <Eye :size="15" />
        <span class="btn-label">Preview</span>
      </button>
    </div>

    <div class="header-right">
      <ThemeToggle />
      <button
        type="button"
        class="btn-icon header-profile-btn"
        title="Account Settings"
        aria-label="Account Settings"
        @click="$emit('open-profile')"
      >
        <User :size="16" />
      </button>
      <button
        type="button"
        class="btn btn-primary btn-header-new"
        title="New Note (Ctrl+N)"
        aria-label="New Note"
        @click="$emit('create-note')"
      >
        <Plus :size="15" />
        <span class="new-note-label">New Note</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  z-index: 20;
  transition: background-color 0.25s ease, border-color 0.25s ease;
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

.btn-header-new {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
}
</style>
