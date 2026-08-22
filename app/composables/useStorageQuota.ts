import { ref, computed } from 'vue';
import type { StorageQuotaInfo, StorageStatus } from '../../shared/types/storage';

export const WARNING_PERCENTAGE = 80;
export const CRITICAL_PERCENTAGE = 95;
export const WARNING_REMAINING_BYTES = 50 * 1024 * 1024; // 50 MB
export const CRITICAL_REMAINING_BYTES = 10 * 1024 * 1024; // 10 MB

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const clampedIndex = Math.min(i, sizes.length - 1);
  if (clampedIndex === 0) return `${bytes} B`;
  const val = bytes / Math.pow(k, clampedIndex);
  const maxDecimals = clampedIndex >= 3 ? Math.max(decimals, 2) : decimals;
  const formatted = parseFloat(val.toFixed(maxDecimals)).toString();
  return `${formatted} ${sizes[clampedIndex]}`;
}

export function calculateStorageStatus(usage: number, quota: number): StorageStatus {
  if (quota <= 0) return 'normal';
  const remaining = Math.max(0, quota - usage);
  const percentage = (usage / quota) * 100;

  if (remaining <= 0 || percentage >= 100) {
    return 'exceeded';
  }
  if (percentage >= CRITICAL_PERCENTAGE || remaining < CRITICAL_REMAINING_BYTES) {
    return 'critical';
  }
  if (percentage >= WARNING_PERCENTAGE || remaining < WARNING_REMAINING_BYTES) {
    return 'warning';
  }
  return 'normal';
}

const defaultQuotaInfo: StorageQuotaInfo = {
  usage: 0,
  quota: 0,
  remaining: 0,
  percentage: 0,
  formattedUsage: '0 B',
  formattedQuota: '0 B',
  formattedRemaining: '0 B',
  status: 'normal',
  isPersisted: false,
  isSupported: true,
};

// Singleton reactive state
const quotaInfo = ref<StorageQuotaInfo>({ ...defaultQuotaInfo });
const isChecking = ref(false);

const isStorageNearLimit = computed(() => {
  return (
    quotaInfo.value.status === 'warning' ||
    quotaInfo.value.status === 'critical' ||
    quotaInfo.value.status === 'exceeded'
  );
});

const isStorageCritical = computed(() => {
  return (
    quotaInfo.value.status === 'critical' ||
    quotaInfo.value.status === 'exceeded'
  );
});

export function useStorageQuota() {
  async function checkQuota(): Promise<StorageQuotaInfo> {
    isChecking.value = true;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.storage &&
        typeof navigator.storage.estimate === 'function'
      ) {
        const estimate = await navigator.storage.estimate();
        const isPersisted =
          typeof navigator.storage.persisted === 'function'
            ? await navigator.storage.persisted()
            : false;

        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        const remaining = Math.max(0, quota - usage);
        const percentage =
          quota > 0 ? Math.min(100, Math.max(0, (usage / quota) * 100)) : 0;
        const status = calculateStorageStatus(usage, quota);

        quotaInfo.value = {
          usage,
          quota,
          remaining,
          percentage,
          formattedUsage: formatBytes(usage),
          formattedQuota: formatBytes(quota),
          formattedRemaining: formatBytes(remaining),
          status,
          isPersisted,
          isSupported: true,
        };
        return quotaInfo.value;
      } else {
        quotaInfo.value = {
          usage: 0,
          quota: 0,
          remaining: 0,
          percentage: 0,
          formattedUsage: '0 B',
          formattedQuota: 'N/A',
          formattedRemaining: 'N/A',
          status: 'normal',
          isPersisted: false,
          isSupported: false,
        };
        return quotaInfo.value;
      }
    } catch (err) {
      console.error('Failed to estimate storage quota:', err);
      return quotaInfo.value;
    } finally {
      isChecking.value = false;
    }
  }

  async function requestPersistence(): Promise<boolean> {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      try {
        const persisted = await navigator.storage.persist();
        quotaInfo.value.isPersisted = persisted;
        return persisted;
      } catch (err) {
        console.error('Failed to request persistence:', err);
        return false;
      }
    }
    return false;
  }

  function setStorageExceeded(): void {
    quotaInfo.value = {
      ...quotaInfo.value,
      status: 'exceeded',
      remaining: 0,
      percentage: 100,
    };
  }

  function validateStorageBeforeAction(actionName?: string): {
    allowed: boolean;
    warning?: string;
  } {
    if (quotaInfo.value.status === 'exceeded') {
      return {
        allowed: false,
        warning: `Storage limit exceeded. Unable to ${actionName || 'perform action'}. Please export a backup and delete unused notes.`,
      };
    }
    if (quotaInfo.value.status === 'critical') {
      return {
        allowed: true,
        warning: `Storage space is critically low (${quotaInfo.value.percentage.toFixed(1)}% used, ${quotaInfo.value.formattedRemaining} remaining).`,
      };
    }
    if (quotaInfo.value.status === 'warning') {
      return {
        allowed: true,
        warning: `Storage space is running low (${quotaInfo.value.percentage.toFixed(1)}% used, ${quotaInfo.value.formattedRemaining} remaining).`,
      };
    }
    return { allowed: true };
  }

  return {
    // State
    quotaInfo,
    isChecking,
    isStorageNearLimit,
    isStorageCritical,

    // Actions
    checkQuota,
    requestPersistence,
    setStorageExceeded,
    validateStorageBeforeAction,
    formatBytes,
    calculateStorageStatus,
  };
}

// Auto-check in browser environment
if (typeof window !== 'undefined') {
  useStorageQuota().checkQuota();
}
