<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  HardDrive,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
} from 'lucide-vue-next';
import { useStorageQuota } from '../composables/useStorageQuota';
import { useNotes } from '../composables/useNotes';
import { useToast } from '../composables/useToast';
import { exportNoteJson, downloadBlob } from '../utils/export';

const { quotaInfo, isChecking, checkQuota, requestPersistence } = useStorageQuota();
const { notes, flushAutoSave } = useNotes();
const { showToast } = useToast();

const isExpanded = ref(false);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

const statusLabel = computed(() => {
  switch (quotaInfo.value.status) {
    case 'warning':
      return 'Near limit';
    case 'critical':
      return 'Critical';
    case 'exceeded':
      return 'Exceeded';
    default:
      return '';
  }
});

async function handleRequestPersistence() {
  const granted = await requestPersistence();
  if (granted) {
    showToast({
      title: 'Persistent Storage Granted',
      message: 'Browser storage will not be evicted under storage pressure.',
      type: 'success',
    });
  } else {
    showToast({
      title: 'Storage Persistence',
      message: 'Browser persistence was not granted or is managed automatically by browser policies.',
      type: 'info',
    });
  }
}

function handleExportBackup() {
  flushAutoSave();
  const content = exportNoteJson(notes.value);
  downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
  showToast({
    title: 'Backup Exported',
    message: `Exported ${notes.value.length} notes to notes-backup.json.`,
    type: 'success',
  });
}

async function handleRefresh() {
  await checkQuota();
}
</script>

<template>
  <div class="storage-quota-widget" :class="`status-${quotaInfo.status}`">
    <!-- Header / Summary Bar (Clickable to toggle details) -->
    <div
      class="storage-summary"
      role="button"
      tabindex="0"
      :aria-expanded="isExpanded"
      aria-label="Storage quota details"
      @click="toggleExpanded"
      @keydown.enter.prevent="toggleExpanded"
      @keydown.space.prevent="toggleExpanded"
    >
      <div class="storage-summary-left">
        <HardDrive :size="14" class="storage-icon" />
        <span class="storage-label">Storage</span>
        <span
          v-if="quotaInfo.status !== 'normal'"
          class="storage-status-badge"
          :class="`badge-${quotaInfo.status}`"
        >
          {{ statusLabel }}
        </span>
      </div>

      <div class="storage-summary-right">
        <span class="storage-percent">{{ Math.round(quotaInfo.percentage) }}%</span>
        <button
          type="button"
          class="btn-toggle-expand"
          :title="isExpanded ? 'Collapse storage details' : 'Expand storage details'"
          :aria-label="isExpanded ? 'Collapse storage details' : 'Expand storage details'"
          @click.stop="toggleExpanded"
        >
          <ChevronDown v-if="isExpanded" :size="14" />
          <ChevronUp v-else :size="14" />
        </button>
      </div>
    </div>

    <!-- Storage Progress Bar -->
    <div
      class="progress-track"
      role="progressbar"
      :aria-valuenow="Math.round(quotaInfo.percentage)"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="`${quotaInfo.formattedUsage} of ${quotaInfo.formattedQuota} used`"
    >
      <div
        class="progress-fill"
        :class="`fill-${quotaInfo.status}`"
        :style="{ width: `${Math.min(100, Math.max(0, quotaInfo.percentage))}%` }"
      ></div>
    </div>

    <!-- Quick Usage Text -->
    <div class="storage-quick-text">
      <span>{{ quotaInfo.formattedUsage }} / {{ quotaInfo.formattedQuota }}</span>
      <span>{{ quotaInfo.formattedRemaining }} free</span>
    </div>

    <!-- Collapsible Storage Details -->
    <transition name="details-slide">
      <div v-if="isExpanded" class="storage-details-panel">
        <div class="details-divider"></div>

        <div class="storage-metrics-grid">
          <div class="metric-row">
            <span class="metric-name">Used</span>
            <span class="metric-value">{{ quotaInfo.formattedUsage }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Total Quota</span>
            <span class="metric-value">{{ quotaInfo.formattedQuota }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Remaining</span>
            <span class="metric-value">{{ quotaInfo.formattedRemaining }}</span>
          </div>
          <div class="metric-row">
            <span class="metric-name">Browser Persistence</span>
            <span v-if="quotaInfo.isPersisted" class="persistence-badge persisted">
              <ShieldCheck :size="12" /> Persisted
            </span>
            <span v-else class="persistence-badge not-persisted">
              <ShieldAlert :size="12" /> Best-effort
            </span>
          </div>
        </div>

        <div class="storage-actions-group">
          <!-- Request Persistence Button -->
          <button
            v-if="!quotaInfo.isPersisted && quotaInfo.isSupported"
            type="button"
            class="btn-widget-action btn-request-persist"
            title="Prevent browser from evicting notes under storage pressure"
            @click="handleRequestPersistence"
          >
            <Shield :size="13" />
            <span>Request Persistence</span>
          </button>

          <!-- Export Backup Button -->
          <button
            type="button"
            class="btn-widget-action btn-export-backup"
            title="Download full JSON backup of all notes"
            @click="handleExportBackup"
          >
            <Download :size="13" />
            <span>Export Backup (.json)</span>
          </button>

          <!-- Refresh Metrics Button -->
          <button
            type="button"
            class="btn-widget-action btn-refresh-quota"
            :class="{ spinning: isChecking }"
            title="Refresh storage quota metrics"
            @click="handleRefresh"
          >
            <RefreshCw :size="13" :class="{ 'icon-spin': isChecking }" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.storage-quota-widget {
  padding: 0.65rem 0.85rem;
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-secondary);
  user-select: none;
  transition: background-color 0.15s ease;
}

.storage-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0.15rem 0;
  gap: 0.5rem;
  outline: none;
  border-radius: var(--radius-sm);
}

.storage-summary:focus-visible {
  box-shadow: 0 0 0 2px var(--border-focus);
}

.storage-summary-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.storage-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.status-warning .storage-icon {
  color: var(--accent-warning);
}

.status-critical .storage-icon,
.status-exceeded .storage-icon {
  color: var(--accent-danger);
}

.storage-label {
  font-weight: 500;
  color: var(--text-primary);
}

.storage-status-badge {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-warning {
  background-color: rgba(200, 179, 126, 0.15);
  color: var(--accent-warning);
  border: 1px solid var(--accent-warning);
}

.badge-critical,
.badge-exceeded {
  background-color: rgba(196, 116, 110, 0.15);
  color: var(--accent-danger);
  border: 1px solid var(--accent-danger);
}

.storage-summary-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.storage-percent {
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.btn-toggle-expand {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.15rem;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease;
}

.btn-toggle-expand:hover {
  color: var(--text-primary);
}

/* Progress Bar */
.progress-track {
  margin-top: 0.4rem;
  height: 5px;
  background-color: var(--bg-app);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease, background-color 0.3s ease;
}

.fill-normal {
  background-color: var(--accent-primary);
}

.fill-warning {
  background-color: var(--accent-warning);
}

.fill-critical,
.fill-exceeded {
  background-color: var(--accent-danger);
}

/* Quick text */
.storage-quick-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.35rem;
  font-size: 0.68rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* Details Panel */
.storage-details-panel {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;
}

.details-divider {
  height: 1px;
  background-color: var(--border-subtle);
  margin-bottom: 0.15rem;
}

.storage-metrics-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.metric-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
}

.metric-name {
  color: var(--text-muted);
}

.metric-value {
  font-weight: 500;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.persistence-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.persistence-badge.persisted {
  color: var(--accent-success);
  background-color: rgba(135, 169, 135, 0.12);
}

.persistence-badge.not-persisted {
  color: var(--text-muted);
  background-color: var(--bg-app);
}

.storage-actions-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.btn-widget-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  transition: all 0.15s ease;
  width: 100%;
}

.btn-widget-action:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-focus);
  color: var(--accent-primary);
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Slide Transition */
.details-slide-enter-active,
.details-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 250px;
}

.details-slide-enter-from,
.details-slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

@media (prefers-reduced-motion: reduce) {
  .details-slide-enter-active,
  .details-slide-leave-active,
  .progress-fill,
  .icon-spin {
    transition: none !important;
    animation: none !important;
  }
}
</style>
