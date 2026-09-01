<script setup lang="ts">
const {
  syncState,
  pendingCount,
  lastSyncedAt,
  errorMessage,
  sync,
} = useSync();

// Capitalized state label (Synced, Syncing, Offline, Error)
const stateLabel = computed<string>(() => {
  switch (syncState.value) {
    case 'synced':
      return 'Synced';
    case 'syncing':
      return 'Syncing';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Error';
    default:
      return syncState.value;
  }
});

// Human-readable accessible label for screen readers
const accessibleLabel = computed<string>(() => {
  let label = `Sync status: ${stateLabel.value}`;
  if (pendingCount.value > 0) {
    label += `, ${pendingCount.value} pending ${pendingCount.value === 1 ? 'change' : 'changes'}`;
  }
  if (syncState.value === 'error' && errorMessage.value) {
    label += `. ${errorMessage.value}`;
  }
  label += '. Click to sync now.';
  return label;
});

// Informative tooltip string
const tooltipText = computed<string>(() => {
  if (syncState.value === 'error') {
    return errorMessage.value
      ? `Status: Error (${errorMessage.value}). Click to retry.`
      : 'Status: Error. Click to retry.';
  }
  if (syncState.value === 'syncing') {
    return 'Status: Syncing. In progress...';
  }
  if (syncState.value === 'offline') {
    return pendingCount.value > 0
      ? `Status: Offline (${pendingCount.value} changes queued). Click to sync when reconnected.`
      : 'Status: Offline. Click to sync when reconnected.';
  }
  // Synced
  if (pendingCount.value > 0) {
    return `Status: Synced (${pendingCount.value} pending). Click to sync now.`;
  }
  return 'Status: Synced. Click to sync now.';
});

function handleSync(): Promise<void> | void {
  return sync();
}
</script>

<template>
  <button
    type="button"
    class="sync-status-badge"
    :class="[
      `sync-state-${syncState}`,
      { 'has-pending': pendingCount > 0 },
    ]"
    :aria-label="accessibleLabel"
    :title="tooltipText"
    @click="handleSync"
  >
    <!-- Status Dot Indicator -->
    <span
      class="status-dot"
      :class="`dot-${syncState}`"
      aria-hidden="true"
    />

    <!-- Sync State Text Label -->
    <span class="sync-state-label">
      {{ stateLabel }}
    </span>

    <!-- Pending Count Indicator -->
    <span
      v-if="pendingCount > 0"
      class="sync-pending-badge"
      aria-hidden="true"
    >
      ({{ pendingCount }} pending)
    </span>
  </button>
</template>

<style scoped>
.sync-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.4rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  white-space: nowrap;
}

.sync-status-badge:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-subtle);
  color: var(--text-primary);
}

.sync-status-badge:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

/* Status Dot */
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.dot-synced {
  background-color: var(--accent-success);
  box-shadow: 0 0 5px var(--accent-success);
}

.dot-syncing {
  background-color: var(--accent-warning);
  box-shadow: 0 0 6px var(--accent-warning);
  animation: pulse-sync 1.4s ease-in-out infinite;
}

.dot-offline {
  background-color: var(--text-muted);
}

.dot-error {
  background-color: var(--accent-danger);
  box-shadow: 0 0 6px var(--accent-danger);
}

/* State-specific text accent */
.sync-state-synced .sync-state-label {
  color: var(--text-secondary);
}

.sync-state-syncing {
  color: var(--accent-warning);
}

.sync-state-syncing .sync-state-label {
  color: var(--accent-warning);
}

.sync-state-offline .sync-state-label {
  color: var(--text-muted);
}

.sync-state-error {
  color: var(--accent-danger);
}

.sync-state-error .sync-state-label {
  color: var(--accent-danger);
}

.sync-state-label {
  font-weight: 500;
}

.sync-pending-badge {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.sync-state-syncing .sync-pending-badge {
  color: var(--accent-warning);
  opacity: 0.85;
}

.sync-state-error .sync-pending-badge {
  color: var(--accent-danger);
  opacity: 0.85;
}

@keyframes pulse-sync {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot-syncing {
    animation: none;
  }
  .sync-status-badge {
    transition: none;
  }
}
</style>
