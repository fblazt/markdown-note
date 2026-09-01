<script setup lang="ts">
import { AlertTriangle, AlertOctagon, Download, X } from 'lucide-vue-next';
import { exportNoteJson, downloadBlob } from '../utils/export';

const { quotaInfo, isStorageNearLimit } = useStorageQuota();
const { notes, flushAutoSave } = useNotes();
const { showToast } = useToast();

const isDismissed = ref(false);
let lastDismissedStatus = ref<string | null>(null);

// Reset dismissal if severity escalates (e.g. from warning to critical or exceeded)
watch(
  () => quotaInfo.value.status,
  (newStatus) => {
    if (newStatus === 'critical' && lastDismissedStatus.value === 'warning') {
      isDismissed.value = false;
    } else if (newStatus === 'exceeded') {
      isDismissed.value = false;
    }
  }
);

const isVisible = computed(() => {
  return isStorageNearLimit.value && !isDismissed.value;
});

const bannerTitle = computed(() => {
  switch (quotaInfo.value.status) {
    case 'exceeded':
      return 'Storage Quota Exceeded!';
    case 'critical':
      return 'Storage Space Critical!';
    case 'warning':
    default:
      return 'Storage Space Low!';
  }
});

const bannerMessage = computed(() => {
  const percent = Math.round(quotaInfo.value.percentage);
  const remaining = quotaInfo.value.formattedRemaining;

  switch (quotaInfo.value.status) {
    case 'exceeded':
      return `Browser storage is completely full (${percent}%). Saving notes will fail until space is freed.`;
    case 'critical':
      return `${percent}% used (${remaining} remaining). Export a backup soon to prevent storage eviction.`;
    case 'warning':
    default:
      return `${percent}% used (${remaining} remaining). Consider archiving older notes.`;
  }
});

function dismissBanner() {
  isDismissed.value = true;
  lastDismissedStatus.value = quotaInfo.value.status;
}

function handleExportBackup() {
  flushAutoSave();
  const content = exportNoteJson(notes.value);
  downloadBlob(content, 'notes-backup.json', 'application/json;charset=utf-8');
  showToast({
    title: 'Backup Exported',
    message: `Successfully exported ${notes.value.length} notes.`,
    type: 'success',
  });
}
</script>

<template>
  <transition name="banner-slide">
    <div
      v-if="isVisible"
      class="storage-alert-banner"
      :class="`banner-${quotaInfo.status}`"
      role="alert"
      aria-live="assertive"
    >
      <div class="banner-left">
        <AlertOctagon
          v-if="quotaInfo.status === 'exceeded' || quotaInfo.status === 'critical'"
          :size="18"
          class="banner-icon"
        />
        <AlertTriangle v-else :size="18" class="banner-icon" />

        <div class="banner-content">
          <span class="banner-title">{{ bannerTitle }}</span>
          <span class="banner-message">{{ bannerMessage }}</span>
        </div>
      </div>

      <div class="banner-right">
        <button
          type="button"
          class="btn-banner-action"
          title="Download JSON backup of all notes"
          @click="handleExportBackup"
        >
          <Download :size="14" />
          <span>Export Backup</span>
        </button>

        <button
          type="button"
          class="btn-banner-dismiss"
          title="Dismiss warning for this session"
          aria-label="Dismiss warning"
          @click="dismissBanner"
        >
          <X :size="16" />
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.storage-alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  transition: all 0.25s ease;
  z-index: 15;
}

.banner-warning {
  background-color: rgba(200, 179, 126, 0.12);
  border-bottom-color: var(--accent-warning);
  color: var(--text-primary);
}

.banner-warning .banner-icon {
  color: var(--accent-warning);
}

.banner-critical,
.banner-exceeded {
  background-color: rgba(196, 116, 110, 0.15);
  border-bottom-color: var(--accent-danger);
  color: var(--text-primary);
}

.banner-critical .banner-icon,
.banner-exceeded .banner-icon {
  color: var(--accent-danger);
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.banner-icon {
  flex-shrink: 0;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  line-height: 1.35;
}

.banner-title {
  font-weight: 700;
  color: var(--text-primary);
}

.banner-message {
  color: var(--text-secondary);
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-banner-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-banner-action:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-focus);
  color: var(--accent-primary);
}

.btn-banner-dismiss {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.btn-banner-dismiss:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

/* Slide Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  max-height: 60px;
  overflow: hidden;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

@media (max-width: 767px) {
  .storage-alert-banner {
    padding: 0.5rem 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  .banner-right {
    width: 100%;
    justify-content: space-between;
  }

  .btn-banner-action {
    flex: 1;
    justify-content: center;
    min-height: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .storage-alert-banner,
  .banner-slide-enter-active,
  .banner-slide-leave-active {
    transition: none !important;
  }
}
</style>
