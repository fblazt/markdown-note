import { ref } from 'vue';
import { db, type Note } from '../utils/db';
import { apiFetch } from '../utils/api';
import { useAuth } from './useAuth';
import { useNotes } from './useNotes';
import { useToast } from './useToast';
import type {
  SyncState,
  SyncConflict,
  SyncPushDTO,
  SyncPushResponse,
  SyncPullResponse,
} from '../../shared/types/sync';

export type {
  SyncState,
  SyncConflict,
  SyncPushDTO,
  SyncPushResponse,
  SyncPullResponse,
};

const syncState = ref<SyncState>('synced');
const pendingCount = ref(0);
const lastSyncedAt = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let eventSource: EventSource | null = null;

// Reactive UX handler for incoming remote tombstones
function handleRemoteTombstones(tombstones: Note[]): void {
  try {
    const { selectedNoteId, saveStatus, selectNextNote, restoreNote } = useNotes();
    const toast = useToast();

    for (const tombstone of tombstones) {
      // Case A: Unfocused note deleted -> silent removal, no toast
      if (tombstone.id !== selectedNoteId.value) {
        continue;
      }

      // Case C: In-flight editing on active note -> Edit-Wins precedence
      if (saveStatus.value === 'unsaved' || saveStatus.value === 'saving') {
        // Keystrokes preserved; debounced auto-save will overwrite tombstone and resurrect note
        continue;
      }

      // Case B: Active clean note deleted -> Transition note + Ambient toast with [Undo / Restore]
      selectNextNote();

      toast.showToast({
        id: `remote-delete-${tombstone.id}`,
        title: 'Note Deleted Remotely',
        message: `Note "${tombstone.title || 'Untitled'}" was deleted remotely.`,
        duration: 8000,
        action: {
          label: 'Undo / Restore',
          onClick: () => restoreNote(tombstone.id),
        },
      });
    }
  } catch {
    // Safe fallback if useNotes or useToast cannot be resolved
  }
}

// Window online / offline event listeners
let isListening = false;

function handleOnline(): void {
  const { isAuthenticated, isOfflineAuthed } = useAuth();
  if (isAuthenticated.value && !isOfflineAuthed.value) {
    sync();
  } else {
    refreshPendingCount();
  }
}

function handleOffline(): void {
  syncState.value = 'offline';
  refreshPendingCount();
}

export function setupWindowListeners(): void {
  if (isListening || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return;
  }
  isListening = true;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

export function cleanupWindowListeners(): void {
  if (!isListening || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') {
    return;
  }
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  isListening = false;
}

// Update pending queue count
async function refreshPendingCount(): Promise<void> {
  try {
    pendingCount.value = await db.mutationQueue.count();
  } catch (err) {
    console.error('Failed to refresh pending count:', err);
  }
}

// Push Phase: send local offline mutations to the backend
async function pushMutations(): Promise<boolean> {
  try {
    const mutations = await db.mutationQueue.orderBy('createdAt').toArray();
    if (mutations.length === 0) {
      return true;
    }

    const res = await apiFetch<SyncPushResponse>('/api/v1/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations } as SyncPushDTO),
    });

    // Remove accepted mutations from queue
    if (res.acceptedIds && res.acceptedIds.length > 0) {
      await db.mutationQueue.bulkDelete(res.acceptedIds);
    }

    // Handle forked conflict notes if any
    if (res.conflicts && res.conflicts.length > 0) {
      for (const conflict of res.conflicts) {
        await db.notes.put({
          ...conflict.forkedNote,
          syncStatus: 'conflict',
        });
      }
    }

    if (res.serverTimestamp) {
      lastSyncedAt.value = res.serverTimestamp;
    }

    await refreshPendingCount();
    return true;
  } catch (err) {
    console.error('Sync push failed:', err);
    return false;
  }
}

// Pull Phase: fetch remote deltas since last_synced_at cursor
async function pullDeltas(): Promise<boolean> {
  try {
    const meta = await db.syncMeta.get('last_synced_at');
    const sinceParam = meta?.value ? `?since=${encodeURIComponent(meta.value)}` : '';

    const res = await apiFetch<SyncPullResponse>(`/api/v1/sync/pull${sinceParam}`);

    await db.transaction('rw', [db.notes, db.folders, db.syncMeta], async () => {
      // Upsert received notes
      if (res.notes && res.notes.length > 0) {
        for (const note of res.notes) {
          await db.notes.put({
            ...note,
            syncStatus: 'synced',
          });
        }
      }

      // Upsert received folders
      if (res.folders && res.folders.length > 0) {
        for (const folder of res.folders) {
          await db.folders.put({
            ...folder,
            syncStatus: 'synced',
          });
        }
      }

      // Record last synced timestamp
      if (res.serverTimestamp) {
        await db.syncMeta.put({
          key: 'last_synced_at',
          value: res.serverTimestamp,
        });
      }
    });

    // Ingest remote soft deletes and coordinate reactive UX
    if (res.notes && res.notes.length > 0) {
      const tombstones = res.notes.filter((n) => !!n.deletedAt);
      if (tombstones.length > 0) {
        handleRemoteTombstones(tombstones);
      }
    }

    if (res.serverTimestamp) {
      lastSyncedAt.value = res.serverTimestamp;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notes-synced'));
    }

    return true;
  } catch (err) {
    console.error('Sync pull failed:', err);
    return false;
  }
}

// Full Two-Way Sync Orchestrator
async function sync(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    syncState.value = 'offline';
    await refreshPendingCount();
    return;
  }

  const { isAuthenticated, isOfflineAuthed } = useAuth();
  if (!isAuthenticated.value || isOfflineAuthed.value) {
    return;
  }

  syncState.value = 'syncing';
  errorMessage.value = null;

  const pushOk = await pushMutations();
  const pullOk = await pullDeltas();

  if (pushOk && pullOk) {
    syncState.value = 'synced';
  } else {
    syncState.value = 'error';
    errorMessage.value = 'Sync failed. Will retry automatically.';
  }
  await refreshPendingCount();
}

// Trigger sync with debounce
function triggerDebouncedSync(delay = 1000): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    sync();
    debounceTimer = null;
  }, delay);
}

// SSE Stream Listener
function initSSE(): void {
  if (eventSource) return;

  const EventSourceConstructor =
    typeof EventSource !== 'undefined'
      ? EventSource
      : typeof globalThis !== 'undefined' && (globalThis as any).EventSource
        ? (globalThis as any).EventSource
        : null;

  if (!EventSourceConstructor) return;

  let sseUrl = '/api/v1/sync/events';
  try {
    const config = useRuntimeConfig();
    if (config?.public?.apiBaseUrl) {
      const base = config.public.apiBaseUrl.replace(/\/+$/, '');
      sseUrl = `${base}/api/v1/sync/events`;
    }
  } catch { }

  try {
    const es = new EventSourceConstructor(sseUrl, { withCredentials: true });
    eventSource = es;

    es.addEventListener('sync_available', () => {
      // Incoming change notification from another client tab/device
      pullDeltas().then(() => {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('notes-synced'));
        }
      });
    });

    es.onerror = () => {
      // EventSource reconnects automatically
    };
  } catch (err) {
    console.error('Failed to initialize SSE:', err);
  }
}

function closeSSE(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export function useSync() {
  setupWindowListeners();

  return {
    syncState,
    pendingCount,
    lastSyncedAt,
    errorMessage,
    refreshPendingCount,
    pushMutations,
    pullDeltas,
    sync,
    triggerDebouncedSync,
    initSSE,
    closeSSE,
    setupWindowListeners,
    cleanupWindowListeners,
  };
}
