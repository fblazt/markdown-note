import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSync, setupWindowListeners, cleanupWindowListeners } from '../../app/composables/useSync';
import { useAuth } from '../../app/composables/useAuth';
import { useNotes } from '../../app/composables/useNotes';
import { useToast } from '../../app/composables/useToast';
import { db, resetDb } from '../../app/utils/db';
import type { Note, FolderRecord, SyncMutation } from '../../shared/types/note';
import type { SyncPushResponse, SyncPullResponse } from '../../shared/types/sync';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, ((event: any) => void)[]> = {};
  closed = false;
  onerror: (() => void) | null = null;

  constructor(url: string, public options?: any) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type]!.push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type]!.filter((l) => l !== listener);
    }
  }

  emit(type: string, data?: any) {
    if (this.listeners[type]) {
      for (const listener of this.listeners[type]!) {
        listener({ data });
      }
    }
  }

  close() {
    this.closed = true;
  }
}

describe('Composable: useSync (app/composables/useSync.ts)', () => {
  const originalFetch = globalThis.fetch;
  const originalEventSource = (globalThis as any).EventSource;

  beforeEach(async () => {
    cleanupWindowListeners();
    vi.restoreAllMocks();
    MockEventSource.instances = [];
    (globalThis as any).EventSource = MockEventSource;

    const windowTarget = new EventTarget();
    const mockWindow = {
      addEventListener: windowTarget.addEventListener.bind(windowTarget),
      removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
      dispatchEvent: windowTarget.dispatchEvent.bind(windowTarget),
    };
    vi.stubGlobal('window', mockWindow);
    if (typeof (globalThis as any).CustomEvent === 'undefined') {
      vi.stubGlobal(
        'CustomEvent',
        class CustomEvent extends Event {
          detail: any;
          constructor(type: string, params?: any) {
            super(type, params);
            this.detail = params?.detail;
          }
        }
      );
    }

    vi.stubGlobal('navigator', {
      onLine: true,
    });

    await resetDb();

    // Reset auth state to authenticated by default
    const auth = useAuth();
    auth.user.value = {
      id: 'usr_test_1',
      email: 'test@example.com',
      name: 'Tester',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    auth.isAuthenticated.value = true;
    auth.isOfflineAuthed.value = false;

    // Reset useSync singleton state
    const sync = useSync();
    sync.syncState.value = 'synced';
    sync.pendingCount.value = 0;
    sync.lastSyncedAt.value = null;
    sync.errorMessage.value = null;
    sync.closeSSE();
  });

  afterEach(() => {
    cleanupWindowListeners();
    globalThis.fetch = originalFetch;
    (globalThis as any).EventSource = originalEventSource;
    vi.unstubAllGlobals();
  });

  describe('refreshPendingCount', () => {
    it('accurately counts pending mutations in db.mutationQueue', async () => {
      const { pendingCount, refreshPendingCount } = useSync();
      expect(pendingCount.value).toBe(0);

      const mutation: SyncMutation = {
        id: 'mut_1',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { title: 'Pending Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };

      await db.mutationQueue.put(mutation);
      await refreshPendingCount();
      expect(pendingCount.value).toBe(1);

      await db.mutationQueue.clear();
      await refreshPendingCount();
      expect(pendingCount.value).toBe(0);
    });
  });

  describe('pushMutations', () => {
    it('returns true and makes no API call when mutationQueue is empty', async () => {
      globalThis.fetch = vi.fn();
      const { pushMutations, pendingCount } = useSync();

      const result = await pushMutations();

      expect(result).toBe(true);
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(pendingCount.value).toBe(0);
    });

    it('pushes mutations, deletes accepted IDs, and updates lastSyncedAt on success', async () => {
      const mutation1: SyncMutation = {
        id: 'mut_note_1',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { id: 'note_1', title: 'Note 1' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      const mutation2: SyncMutation = {
        id: 'mut_folder_1',
        entityType: 'folder',
        entityId: 'Guides',
        action: 'upsert',
        data: { name: 'Guides' },
        createdAt: '2026-08-31T10:01:00.000Z',
      };

      await db.mutationQueue.bulkPut([mutation1, mutation2]);

      const mockResponse: SyncPushResponse = {
        acceptedIds: ['mut_note_1', 'mut_folder_1'],
        conflicts: [],
        serverTimestamp: '2026-08-31T10:05:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          statusCode: 200,
          statusMessage: 'OK',
          data: mockResponse,
        }),
      });

      const { pushMutations, pendingCount, lastSyncedAt } = useSync();

      const result = await pushMutations();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/sync/push',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mutations: [mutation1, mutation2] }),
        })
      );
      expect(await db.mutationQueue.count()).toBe(0);
      expect(pendingCount.value).toBe(0);
      expect(lastSyncedAt.value).toBe('2026-08-31T10:05:00.000Z');
    });

    it('stores forked conflict notes in db.notes with syncStatus = conflict', async () => {
      const mutation: SyncMutation = {
        id: 'mut_conflict_1',
        entityType: 'note',
        entityId: 'note_orig',
        action: 'upsert',
        data: { id: 'note_orig', title: 'Original Note with edit' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      const forkedNote: Note = {
        id: 'note_orig_fork_123',
        title: 'Original Note (Conflict Copy)',
        content: 'Conflicted remote contents',
        tags: ['conflict'],
        createdAt: '2026-08-31T10:00:00.000Z',
        updatedAt: '2026-08-31T10:05:00.000Z',
      };

      const mockResponse: SyncPushResponse = {
        acceptedIds: ['mut_conflict_1'],
        conflicts: [
          {
            originalNoteId: 'note_orig',
            forkedNote,
            reason: 'Concurrent remote modification detected',
          },
        ],
        serverTimestamp: '2026-08-31T10:05:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const { pushMutations } = useSync();
      const result = await pushMutations();

      expect(result).toBe(true);
      expect(await db.mutationQueue.count()).toBe(0);

      const savedFork = await db.notes.get('note_orig_fork_123');
      expect(savedFork).toBeDefined();
      expect(savedFork?.title).toBe('Original Note (Conflict Copy)');
      expect(savedFork?.syncStatus).toBe('conflict');
    });

    it('returns false and logs error on API fetch error without removing mutations', async () => {
      const mutation: SyncMutation = {
        id: 'mut_fail_1',
        entityType: 'note',
        entityId: 'note_fail',
        action: 'upsert',
        data: { id: 'note_fail', title: 'Failed Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Push network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { pushMutations } = useSync();
      const result = await pushMutations();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Sync push failed:', expect.any(Error));
      expect(await db.mutationQueue.count()).toBe(1);
    });
  });

  describe('pullDeltas', () => {
    it('performs initial pull without ?since= parameter, upserts notes/folders, and sets last_synced_at cursor', async () => {
      const remoteNotes: Note[] = [
        {
          id: 'note_remote_1',
          title: 'Remote Note 1',
          content: 'Pulled content',
          tags: ['remote'],
          folder: 'RemoteFolder',
          createdAt: '2026-08-31T09:00:00.000Z',
          updatedAt: '2026-08-31T09:30:00.000Z',
        },
      ];
      const remoteFolders: FolderRecord[] = [
        {
          name: 'RemoteFolder',
        },
      ];

      const mockResponse: SyncPullResponse = {
        notes: remoteNotes,
        folders: remoteFolders,
        serverTimestamp: '2026-08-31T10:10:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          statusCode: 200,
          data: mockResponse,
        }),
      });

      const { pullDeltas, lastSyncedAt } = useSync();
      const result = await pullDeltas();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/sync/pull',
        expect.any(Object)
      );

      // Verify records in IndexedDB
      const savedNote = await db.notes.get('note_remote_1');
      expect(savedNote).toBeDefined();
      expect(savedNote?.title).toBe('Remote Note 1');
      expect(savedNote?.syncStatus).toBe('synced');

      const savedFolder = await db.folders.get('RemoteFolder');
      expect(savedFolder).toBeDefined();
      expect(savedFolder?.syncStatus).toBe('synced');

      const meta = await db.syncMeta.get('last_synced_at');
      expect(meta?.value).toBe('2026-08-31T10:10:00.000Z');
      expect(lastSyncedAt.value).toBe('2026-08-31T10:10:00.000Z');
    });

    it('performs incremental pull with ?since= parameter when previous cursor exists in db.syncMeta', async () => {
      await db.syncMeta.put({
        key: 'last_synced_at',
        value: '2026-08-31T09:00:00.000Z',
      });

      const mockResponse: SyncPullResponse = {
        notes: [],
        folders: [],
        serverTimestamp: '2026-08-31T10:20:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const { pullDeltas, lastSyncedAt } = useSync();
      const result = await pullDeltas();

      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `/api/v1/sync/pull?since=${encodeURIComponent('2026-08-31T09:00:00.000Z')}`,
        expect.any(Object)
      );
      expect(lastSyncedAt.value).toBe('2026-08-31T10:20:00.000Z');

      const meta = await db.syncMeta.get('last_synced_at');
      expect(meta?.value).toBe('2026-08-31T10:20:00.000Z');
    });

    it('handles remote tombstones and triggers toast with restore handler when active note is deleted', async () => {
      const notesComposable = useNotes();
      const createdNote = await notesComposable.createNote({ title: 'Active Note To Delete Remotely' });
      const activeId = createdNote!.id;
      notesComposable.selectedNoteId.value = activeId;
      notesComposable.saveStatus.value = 'idle';

      const toast = useToast();
      toast.clearAllToasts();

      const tombstoneNote: Note = {
        id: activeId,
        title: 'Active Note Deleted Remotely',
        content: 'Content',
        tags: [],
        createdAt: '2026-08-31T08:00:00.000Z',
        updatedAt: '2026-08-31T10:00:00.000Z',
        deletedAt: '2026-08-31T10:00:00.000Z',
      };

      const mockResponse: SyncPullResponse = {
        notes: [tombstoneNote],
        folders: [],
        serverTimestamp: '2026-08-31T10:30:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const { pullDeltas } = useSync();
      const result = await pullDeltas();

      expect(result).toBe(true);
      expect(toast.toasts.value.some((t) => t.id === `remote-delete-${activeId}`)).toBe(true);
    });

    it('returns false and logs error on API fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Pull fetch failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { pullDeltas } = useSync();
      const result = await pullDeltas();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Sync pull failed:', expect.any(Error));
    });
  });

  describe('sync orchestrator', () => {
    it('sets syncState to offline and does not call APIs when navigator.onLine is false', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      globalThis.fetch = vi.fn();

      const { sync, syncState } = useSync();
      await sync();

      expect(syncState.value).toBe('offline');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('skips sync when user is unauthenticated', async () => {
      const auth = useAuth();
      auth.isAuthenticated.value = false;
      globalThis.fetch = vi.fn();

      const { sync, syncState } = useSync();
      await sync();

      expect(syncState.value).toBe('synced');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('skips sync when user is offline-authenticated (isOfflineAuthed)', async () => {
      const auth = useAuth();
      auth.isAuthenticated.value = true;
      auth.isOfflineAuthed.value = true;
      globalThis.fetch = vi.fn();

      const { sync, syncState } = useSync();
      await sync();

      expect(syncState.value).toBe('synced');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('executes push then pull sequentially and sets syncState to synced on full success', async () => {
      const mutation: SyncMutation = {
        id: 'mut_seq_1',
        entityType: 'note',
        entityId: 'note_seq_1',
        action: 'upsert',
        data: { title: 'Sequential Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      const pushResponse: SyncPushResponse = {
        acceptedIds: ['mut_seq_1'],
        conflicts: [],
        serverTimestamp: '2026-08-31T10:40:00.000Z',
      };
      const pullResponse: SyncPullResponse = {
        notes: [],
        folders: [],
        serverTimestamp: '2026-08-31T10:41:00.000Z',
      };

      const callOrder: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/sync/push')) {
          callOrder.push('push');
          return {
            ok: true,
            status: 200,
            json: async () => pushResponse,
          };
        }
        if (url.includes('/sync/pull')) {
          callOrder.push('pull');
          return {
            ok: true,
            status: 200,
            json: async () => pullResponse,
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      });

      const { sync, syncState, errorMessage, pendingCount, lastSyncedAt } = useSync();

      await sync();

      expect(callOrder).toEqual(['push', 'pull']);
      expect(syncState.value).toBe('synced');
      expect(errorMessage.value).toBeNull();
      expect(pendingCount.value).toBe(0);
      expect(lastSyncedAt.value).toBe('2026-08-31T10:41:00.000Z');
    });

    it('sets syncState to error and populates errorMessage if push fails', async () => {
      const mutation: SyncMutation = {
        id: 'mut_push_err',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { title: 'Push Err Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/sync/push')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server Internal Error on push' }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ notes: [], folders: [], serverTimestamp: '2026-08-31T10:00:00.000Z' }),
        };
      });

      const { sync, syncState, errorMessage } = useSync();
      await sync();

      expect(syncState.value).toBe('error');
      expect(errorMessage.value).toBe('Sync failed. Will retry automatically.');
    });

    it('sets syncState to error and populates errorMessage if pull fails', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/sync/pull')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server Internal Error on pull' }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ acceptedIds: [], conflicts: [], serverTimestamp: '2026-08-31T10:00:00.000Z' }),
        };
      });

      const { sync, syncState, errorMessage } = useSync();
      await sync();

      expect(syncState.value).toBe('error');
      expect(errorMessage.value).toBe('Sync failed. Will retry automatically.');
    });
  });

  describe('triggerDebouncedSync', () => {
    it('debounces rapid consecutive calls into a single sync execution', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      const mockPull: SyncPullResponse = {
        notes: [],
        folders: [],
        serverTimestamp: '2026-08-31T11:00:00.000Z',
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPull,
      });

      const { triggerDebouncedSync } = useSync();

      // Trigger multiple rapid sync invocations
      triggerDebouncedSync(500);
      triggerDebouncedSync(500);
      triggerDebouncedSync(500);

      expect(globalThis.fetch).not.toHaveBeenCalled();

      // Fast-forward timer by 300ms (not yet reached 500ms)
      await vi.advanceTimersByTimeAsync(300);
      expect(globalThis.fetch).not.toHaveBeenCalled();

      // Fast-forward remaining 250ms (crosses 500ms threshold)
      await vi.advanceTimersByTimeAsync(250);

      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Window online and offline event listeners', () => {
    it('transitions syncState and refreshes pending count on window offline event', async () => {
      const { syncState, pendingCount } = useSync();
      syncState.value = 'synced';
      const mutation: SyncMutation = {
        id: 'mut_offline_1',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { title: 'Pending Offline Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      window.dispatchEvent(new Event('offline'));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(syncState.value).toBe('offline');
      expect(pendingCount.value).toBe(1);
    });

    it('transitions syncState and triggers sync on window online event when authenticated', async () => {
      const mockPull: SyncPullResponse = {
        notes: [],
        folders: [],
        serverTimestamp: '2026-08-31T11:00:00.000Z',
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPull,
      });

      const { syncState } = useSync();
      syncState.value = 'offline';

      window.dispatchEvent(new Event('online'));

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(syncState.value).toBe('synced');
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('refreshes pending count but skips sync on window online event when unauthenticated', async () => {
      const auth = useAuth();
      auth.isAuthenticated.value = false;
      globalThis.fetch = vi.fn();

      const mutation: SyncMutation = {
        id: 'mut_online_unauth',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { title: 'Unauth Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      const { pendingCount } = useSync();
      expect(pendingCount.value).toBe(0);

      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(pendingCount.value).toBe(1);
    });

    it('refreshes pending count but skips sync on window online event when offline authenticated', async () => {
      const auth = useAuth();
      auth.isAuthenticated.value = true;
      auth.isOfflineAuthed.value = true;
      globalThis.fetch = vi.fn();

      const mutation: SyncMutation = {
        id: 'mut_online_offauth',
        entityType: 'note',
        entityId: 'note_1',
        action: 'upsert',
        data: { title: 'Offline Authed Note' },
        createdAt: '2026-08-31T10:00:00.000Z',
      };
      await db.mutationQueue.put(mutation);

      const { pendingCount } = useSync();
      expect(pendingCount.value).toBe(0);

      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(pendingCount.value).toBe(1);
    });

    it('stops listening to online and offline events after cleanupWindowListeners is called', async () => {
      const { syncState, cleanupWindowListeners: cleanup } = useSync();
      syncState.value = 'synced';

      cleanup();

      window.dispatchEvent(new Event('offline'));
      expect(syncState.value).toBe('synced');

      globalThis.fetch = vi.fn();
      window.dispatchEvent(new Event('online'));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('is idempotent when setupWindowListeners is called repeatedly', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      setupWindowListeners();
      setupWindowListeners();
      setupWindowListeners();

      // Already setup in beforeEach / useSync, so repeated calls don't add listeners again
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('handles missing window or event listener methods safely', () => {
      cleanupWindowListeners();
      vi.stubGlobal('window', undefined);

      expect(() => setupWindowListeners()).not.toThrow();
      expect(() => cleanupWindowListeners()).not.toThrow();
    });
  });

  describe('SSE Stream Listener (initSSE & closeSSE)', () => {
    it('initializes EventSource and pulls deltas on sync_available event', async () => {
      const mockPull: SyncPullResponse = {
        notes: [
          {
            id: 'sse_note_1',
            title: 'SSE Remote Note',
            content: 'SSE content',
            tags: [],
            createdAt: '2026-08-31T11:00:00.000Z',
            updatedAt: '2026-08-31T11:00:00.000Z',
          },
        ],
        folders: [],
        serverTimestamp: '2026-08-31T11:05:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPull,
      });

      const { initSSE, closeSSE } = useSync();
      initSSE();

      expect(MockEventSource.instances.length).toBe(1);
      const sseInstance = MockEventSource.instances[0]!;
      expect(sseInstance.url).toBe('/api/v1/sync/events');

      const syncedListener = vi.fn();
      window.addEventListener('notes-synced', syncedListener);

      // Trigger sync_available event
      sseInstance.emit('sync_available');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/sync/pull',
        expect.any(Object)
      );
      expect(syncedListener).toHaveBeenCalled();

      // Close SSE
      closeSSE();
      expect(sseInstance.closed).toBe(true);
      window.removeEventListener('notes-synced', syncedListener);
    });
  });
});
