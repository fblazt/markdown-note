// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import SyncStatusBadge from '../../app/components/SyncStatusBadge.vue';
import { useSync, cleanupWindowListeners } from '../../app/composables/useSync';
import { useAuth } from '../../app/composables/useAuth';
import { resetDb } from '../../app/utils/db';

describe('Component: SyncStatusBadge (app/components/SyncStatusBadge.vue)', () => {
  let wrapper: VueWrapper<any>;
  const sync = useSync();
  const auth = useAuth();
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    cleanupWindowListeners();
    vi.restoreAllMocks();
    await resetDb();

    // Mock fetch for sync operations
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/v1/sync/push')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            acceptedIds: [],
            conflicts: [],
            serverTimestamp: '2026-08-31T12:00:00.000Z',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          notes: [],
          folders: [],
          serverTimestamp: '2026-08-31T12:00:00.000Z',
        }),
      };
    });

    vi.stubGlobal('navigator', {
      onLine: true,
    });

    // Reset auth state
    auth.user.value = {
      id: 'usr_badge_test',
      email: 'test@example.com',
      name: 'Badge Tester',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    auth.isAuthenticated.value = true;
    auth.isOfflineAuthed.value = false;

    // Reset useSync reactive singleton state
    sync.syncState.value = 'synced';
    sync.pendingCount.value = 0;
    sync.lastSyncedAt.value = null;
    sync.errorMessage.value = null;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    cleanupWindowListeners();
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  function createWrapper() {
    return mount(SyncStatusBadge);
  }

  async function waitForAsync(): Promise<void> {
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await flushPromises();
  }

  describe('Component Structure & Accessibility Attributes', () => {
    it('renders a button element with type="button"', () => {
      wrapper = createWrapper();
      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.attributes('type')).toBe('button');
    });

    it('sets aria-hidden="true" on decorative status dot and pending count badge', async () => {
      sync.pendingCount.value = 3;
      wrapper = createWrapper();
      await waitForAsync();

      const dot = wrapper.find('.status-dot');
      const pendingBadge = wrapper.find('.sync-pending-badge');

      expect(dot.exists()).toBe(true);
      expect(dot.attributes('aria-hidden')).toBe('true');
      expect(pendingBadge.exists()).toBe(true);
      expect(pendingBadge.attributes('aria-hidden')).toBe('true');
    });
  });

  describe('Sync State Visual Rendering & Dynamic Classes', () => {
    it('renders correctly in synced state', async () => {
      sync.syncState.value = 'synced';
      wrapper = createWrapper();

      const button = wrapper.find('button');
      const dot = wrapper.find('.status-dot');
      const label = wrapper.find('.sync-state-label');

      expect(button.classes()).toContain('sync-state-synced');
      expect(dot.classes()).toContain('dot-synced');
      expect(label.text()).toBe('Synced');
    });

    it('renders correctly in syncing state', async () => {
      sync.syncState.value = 'syncing';
      wrapper = createWrapper();

      const button = wrapper.find('button');
      const dot = wrapper.find('.status-dot');
      const label = wrapper.find('.sync-state-label');

      expect(button.classes()).toContain('sync-state-syncing');
      expect(dot.classes()).toContain('dot-syncing');
      expect(label.text()).toBe('Syncing');
    });

    it('renders correctly in offline state', async () => {
      sync.syncState.value = 'offline';
      wrapper = createWrapper();

      const button = wrapper.find('button');
      const dot = wrapper.find('.status-dot');
      const label = wrapper.find('.sync-state-label');

      expect(button.classes()).toContain('sync-state-offline');
      expect(dot.classes()).toContain('dot-offline');
      expect(label.text()).toBe('Offline');
    });

    it('renders correctly in error state', async () => {
      sync.syncState.value = 'error';
      sync.errorMessage.value = 'Failed to push mutations';
      wrapper = createWrapper();

      const button = wrapper.find('button');
      const dot = wrapper.find('.status-dot');
      const label = wrapper.find('.sync-state-label');

      expect(button.classes()).toContain('sync-state-error');
      expect(dot.classes()).toContain('dot-error');
      expect(label.text()).toBe('Error');
    });

    it('reactively updates class names and text when syncState transitions', async () => {
      sync.syncState.value = 'synced';
      wrapper = createWrapper();
      expect(wrapper.find('.sync-state-label').text()).toBe('Synced');
      expect(wrapper.find('.status-dot').classes()).toContain('dot-synced');

      sync.syncState.value = 'syncing';
      await waitForAsync();
      expect(wrapper.find('.sync-state-label').text()).toBe('Syncing');
      expect(wrapper.find('.status-dot').classes()).toContain('dot-syncing');

      sync.syncState.value = 'error';
      await waitForAsync();
      expect(wrapper.find('.sync-state-label').text()).toBe('Error');
      expect(wrapper.find('.status-dot').classes()).toContain('dot-error');

      sync.syncState.value = 'offline';
      await waitForAsync();
      expect(wrapper.find('.sync-state-label').text()).toBe('Offline');
      expect(wrapper.find('.status-dot').classes()).toContain('dot-offline');
    });
  });

  describe('Pending Mutation Count Badge', () => {
    it('does not render pending badge when pendingCount is 0', () => {
      sync.pendingCount.value = 0;
      wrapper = createWrapper();

      expect(wrapper.find('.sync-pending-badge').exists()).toBe(false);
      expect(wrapper.find('button').classes()).not.toContain('has-pending');
    });

    it('renders pending badge when pendingCount > 0', async () => {
      sync.pendingCount.value = 4;
      wrapper = createWrapper();

      const pendingBadge = wrapper.find('.sync-pending-badge');
      expect(pendingBadge.exists()).toBe(true);
      expect(pendingBadge.text()).toBe('(4 pending)');
      expect(wrapper.find('button').classes()).toContain('has-pending');
    });

    it('reactively displays and hides pending badge as pendingCount changes', async () => {
      sync.pendingCount.value = 0;
      wrapper = createWrapper();
      expect(wrapper.find('.sync-pending-badge').exists()).toBe(false);

      sync.pendingCount.value = 7;
      await waitForAsync();
      expect(wrapper.find('.sync-pending-badge').exists()).toBe(true);
      expect(wrapper.find('.sync-pending-badge').text()).toBe('(7 pending)');

      sync.pendingCount.value = 0;
      await waitForAsync();
      expect(wrapper.find('.sync-pending-badge').exists()).toBe(false);
    });
  });

  describe('Accessible Label & Tooltip Computations', () => {
    it('generates correct aria-label and title in synced state without pending changes', () => {
      sync.syncState.value = 'synced';
      sync.pendingCount.value = 0;
      wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Sync status: Synced. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Synced. Click to sync now.');
    });

    it('generates correct aria-label and title in synced state with pending changes', async () => {
      sync.syncState.value = 'synced';
      sync.pendingCount.value = 1;
      wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Sync status: Synced, 1 pending change. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Synced (1 pending). Click to sync now.');

      sync.pendingCount.value = 5;
      await waitForAsync();
      expect(button.attributes('aria-label')).toBe('Sync status: Synced, 5 pending changes. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Synced (5 pending). Click to sync now.');
    });

    it('generates correct aria-label and title in syncing state', () => {
      sync.syncState.value = 'syncing';
      wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Sync status: Syncing. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Syncing. In progress...');
    });

    it('generates correct aria-label and title in offline state', async () => {
      sync.syncState.value = 'offline';
      sync.pendingCount.value = 0;
      wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Sync status: Offline. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Offline. Click to sync when reconnected.');

      sync.pendingCount.value = 2;
      await waitForAsync();
      expect(button.attributes('aria-label')).toBe('Sync status: Offline, 2 pending changes. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Offline (2 changes queued). Click to sync when reconnected.');
    });

    it('generates correct aria-label and title in error state with and without errorMessage', async () => {
      sync.syncState.value = 'error';
      sync.errorMessage.value = null;
      wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Sync status: Error. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Error. Click to retry.');

      sync.errorMessage.value = 'Connection timed out';
      await waitForAsync();
      expect(button.attributes('aria-label')).toBe('Sync status: Error. Connection timed out. Click to sync now.');
      expect(button.attributes('title')).toBe('Status: Error (Connection timed out). Click to retry.');
    });
  });

  describe('User Interaction & Manual Trigger', () => {
    it('triggers sync() and initiates pull API call when badge button is clicked', async () => {
      wrapper = createWrapper();

      await wrapper.find('button').trigger('click');
      await waitForAsync();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/sync/pull',
        expect.objectContaining({
          credentials: 'include',
        })
      );
      expect(sync.syncState.value).toBe('synced');
    });

    it('triggers sync() multiple times on successive clicks', async () => {
      wrapper = createWrapper();

      await wrapper.find('button').trigger('click');
      await waitForAsync();

      await wrapper.find('button').trigger('click');
      await waitForAsync();

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('handles offline state when clicked while navigator is offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      wrapper = createWrapper();

      await wrapper.find('button').trigger('click');
      await waitForAsync();

      expect(sync.syncState.value).toBe('offline');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('sets syncState to error when pull API fails on manual click', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database unreachable' }),
      }));

      wrapper = createWrapper();

      await wrapper.find('button').trigger('click');
      await waitForAsync();

      expect(sync.syncState.value).toBe('error');
      expect(sync.errorMessage.value).toBe('Sync failed. Will retry automatically.');
    });
  });
});
