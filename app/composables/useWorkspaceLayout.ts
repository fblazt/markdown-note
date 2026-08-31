import { ref, computed } from 'vue';

export type ViewMode = 'split' | 'editor' | 'preview';

// Singleton refs to preserve layout state across component tree
const viewMode = ref<ViewMode>('split');
const isSidebarOpen = ref(true);
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

// Global resize listener for responsive layout updates
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768;
  });
}

export function useWorkspaceLayout() {
  const effectiveViewMode = computed<ViewMode>(() => {
    if (isMobile.value && viewMode.value === 'split') {
      return 'editor';
    }
    return viewMode.value;
  });

  const isEditorActive = computed<boolean>(() => {
    if (isMobile.value) {
      return !isSidebarOpen.value && effectiveViewMode.value === 'editor';
    }
    return effectiveViewMode.value === 'split' || effectiveViewMode.value === 'editor';
  });

  const isPreviewActive = computed<boolean>(() => {
    if (isMobile.value) {
      return !isSidebarOpen.value && effectiveViewMode.value === 'preview';
    }
    return effectiveViewMode.value === 'split' || effectiveViewMode.value === 'preview';
  });

  function setViewMode(mode: ViewMode): void {
    if (isMobile.value && mode === 'split') {
      viewMode.value = 'editor';
    } else {
      viewMode.value = mode;
    }
  }

  function toggleSidebar(): void {
    isSidebarOpen.value = !isSidebarOpen.value;
  }

  function navigateBackToList(): void {
    isSidebarOpen.value = true;
  }

  function checkMobile(): boolean {
    if (typeof window !== 'undefined') {
      isMobile.value = window.innerWidth < 768;
    }
    return isMobile.value;
  }

  return {
    viewMode,
    isSidebarOpen,
    isMobile,
    effectiveViewMode,
    isEditorActive,
    isPreviewActive,
    setViewMode,
    toggleSidebar,
    navigateBackToList,
    checkMobile,
  };
}
