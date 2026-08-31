import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceLayout } from '../../app/composables/useWorkspaceLayout';

describe('Composable: useWorkspaceLayout', () => {
  beforeEach(() => {
    const layout = useWorkspaceLayout();
    layout.viewMode.value = 'split';
    layout.isSidebarOpen.value = true;
    layout.isMobile.value = false;
  });

  it('manages viewMode and computes effectiveViewMode in desktop', () => {
    const layout = useWorkspaceLayout();
    expect(layout.viewMode.value).toBe('split');
    expect(layout.effectiveViewMode.value).toBe('split');

    layout.setViewMode('editor');
    expect(layout.viewMode.value).toBe('editor');
    expect(layout.effectiveViewMode.value).toBe('editor');

    layout.setViewMode('preview');
    expect(layout.viewMode.value).toBe('preview');
    expect(layout.effectiveViewMode.value).toBe('preview');
  });

  it('forces editor mode on mobile when split mode is selected', () => {
    const layout = useWorkspaceLayout();
    layout.isMobile.value = true;
    layout.viewMode.value = 'split';

    expect(layout.effectiveViewMode.value).toBe('editor');

    layout.setViewMode('split');
    expect(layout.viewMode.value).toBe('editor');
    expect(layout.effectiveViewMode.value).toBe('editor');
  });

  it('computes isEditorActive and isPreviewActive on desktop', () => {
    const layout = useWorkspaceLayout();
    layout.isMobile.value = false;

    layout.setViewMode('split');
    expect(layout.isEditorActive.value).toBe(true);
    expect(layout.isPreviewActive.value).toBe(true);

    layout.setViewMode('editor');
    expect(layout.isEditorActive.value).toBe(true);
    expect(layout.isPreviewActive.value).toBe(false);

    layout.setViewMode('preview');
    expect(layout.isEditorActive.value).toBe(false);
    expect(layout.isPreviewActive.value).toBe(true);
  });

  it('computes isEditorActive and isPreviewActive on mobile based on sidebar and mode', () => {
    const layout = useWorkspaceLayout();
    layout.isMobile.value = true;
    layout.isSidebarOpen.value = true;
    layout.setViewMode('editor');

    // When sidebar is open on mobile, neither editor nor preview is active
    expect(layout.isEditorActive.value).toBe(false);
    expect(layout.isPreviewActive.value).toBe(false);

    layout.isSidebarOpen.value = false;
    expect(layout.isEditorActive.value).toBe(true);
    expect(layout.isPreviewActive.value).toBe(false);

    layout.setViewMode('preview');
    expect(layout.isEditorActive.value).toBe(false);
    expect(layout.isPreviewActive.value).toBe(true);
  });

  it('toggles sidebar and navigates back to list', () => {
    const layout = useWorkspaceLayout();
    layout.isSidebarOpen.value = true;

    layout.toggleSidebar();
    expect(layout.isSidebarOpen.value).toBe(false);

    layout.navigateBackToList();
    expect(layout.isSidebarOpen.value).toBe(true);
  });
});
