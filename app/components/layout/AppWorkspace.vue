<script setup lang="ts">
const {
  effectiveViewMode,
  isSidebarOpen,
  isMobile,
  isEditorActive,
  isPreviewActive,
} = useWorkspaceLayout();
</script>

<template>
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
</template>

<style scoped>
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
  .panel-container {
    transition: none !important;
  }
}
</style>
