import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useStorageQuota,
  formatBytes,
  calculateStorageStatus,
  WARNING_PERCENTAGE,
  CRITICAL_PERCENTAGE,
  WARNING_REMAINING_BYTES,
  CRITICAL_REMAINING_BYTES,
} from '../../app/composables/useStorageQuota';

describe('Composable: useStorageQuota & helpers', () => {
  describe('formatBytes helper', () => {
    it('formats 0 or invalid numbers as "0 B"', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(NaN)).toBe('0 B');
    });

    it('formats bytes, kilobytes, megabytes, and gigabytes correctly', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(12.4 * 1024 * 1024)).toBe('12.4 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1.2 * 1024 * 1024 * 1024)).toBe('1.2 GB');
      expect(formatBytes(1.18 * 1024 * 1024 * 1024)).toBe('1.18 GB');
    });
  });

  describe('calculateStorageStatus helper', () => {
    const ONE_GB = 1024 * 1024 * 1024;

    it('returns "normal" for low usage with plenty of space', () => {
      // 100MB used of 1GB (~10%)
      const status = calculateStorageStatus(100 * 1024 * 1024, ONE_GB);
      expect(status).toBe('normal');
    });

    it('returns "warning" when usage percentage is >= 80%', () => {
      // 820MB of 1GB (82%)
      const status = calculateStorageStatus(820 * 1024 * 1024, ONE_GB);
      expect(status).toBe('warning');
    });

    it('returns "warning" when remaining space is < 50MB even if percentage < 80%', () => {
      // Total 60MB quota, 20MB used -> 40MB remaining (33% used, but remaining < 50MB)
      const status = calculateStorageStatus(20 * 1024 * 1024, 60 * 1024 * 1024);
      expect(status).toBe('warning');
    });

    it('returns "critical" when usage percentage is >= 95%', () => {
      // 980MB of 1GB (980 / 1024 = 95.7%)
      const status = calculateStorageStatus(980 * 1024 * 1024, ONE_GB);
      expect(status).toBe('critical');
    });

    it('returns "critical" when remaining space is < 10MB', () => {
      // Total 20MB quota, 12MB used -> 8MB remaining (< 10MB)
      const status = calculateStorageStatus(12 * 1024 * 1024, 20 * 1024 * 1024);
      expect(status).toBe('critical');
    });

    it('returns "exceeded" when remaining space is 0 or usage >= quota', () => {
      expect(calculateStorageStatus(ONE_GB, ONE_GB)).toBe('exceeded');
      expect(calculateStorageStatus(ONE_GB + 500, ONE_GB)).toBe('exceeded');
    });

    it('returns "normal" if quota is 0 or invalid', () => {
      expect(calculateStorageStatus(0, 0)).toBe('normal');
      expect(calculateStorageStatus(100, 0)).toBe('normal');
    });
  });

  describe('useStorageQuota composable', () => {
    let mockEstimate: any;
    let mockPersisted: any;
    let mockPersist: any;

    beforeEach(() => {
      mockEstimate = vi.fn().mockResolvedValue({
        usage: 100 * 1024 * 1024, // 100MB
        quota: 1024 * 1024 * 1024, // 1GB
      });
      mockPersisted = vi.fn().mockResolvedValue(false);
      mockPersist = vi.fn().mockResolvedValue(true);

      const mockStorage = {
        estimate: mockEstimate,
        persisted: mockPersisted,
        persist: mockPersist,
      };

      vi.stubGlobal('navigator', {
        storage: mockStorage,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('estimates storage quota and updates reactive quotaInfo', async () => {
      const quota = useStorageQuota();
      const info = await quota.checkQuota();

      expect(mockEstimate).toHaveBeenCalled();
      expect(mockPersisted).toHaveBeenCalled();
      expect(info.usage).toBe(100 * 1024 * 1024);
      expect(info.quota).toBe(1024 * 1024 * 1024);
      expect(info.remaining).toBe(924 * 1024 * 1024);
      expect(info.status).toBe('normal');
      expect(info.isPersisted).toBe(false);
      expect(info.isSupported).toBe(true);
      expect(quota.isStorageNearLimit.value).toBe(false);
      expect(quota.isStorageCritical.value).toBe(false);
    });

    it('computes isStorageNearLimit and isStorageCritical correctly for warning and critical states', async () => {
      const quota = useStorageQuota();

      // Warning state (82% used)
      mockEstimate.mockResolvedValueOnce({
        usage: 820 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
      });
      await quota.checkQuota();

      expect(quota.quotaInfo.value.status).toBe('warning');
      expect(quota.isStorageNearLimit.value).toBe(true);
      expect(quota.isStorageCritical.value).toBe(false);

      // Critical state (95.7% used)
      mockEstimate.mockResolvedValueOnce({
        usage: 980 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
      });
      await quota.checkQuota();

      expect(quota.quotaInfo.value.status).toBe('critical');
      expect(quota.isStorageNearLimit.value).toBe(true);
      expect(quota.isStorageCritical.value).toBe(true);
    });

    it('handles persistence request via requestPersistence()', async () => {
      const quota = useStorageQuota();
      const result = await quota.requestPersistence();

      expect(mockPersist).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(quota.quotaInfo.value.isPersisted).toBe(true);
    });

    it('setStorageExceeded immediately updates status to exceeded', () => {
      const quota = useStorageQuota();
      quota.setStorageExceeded();

      expect(quota.quotaInfo.value.status).toBe('exceeded');
      expect(quota.quotaInfo.value.percentage).toBe(100);
      expect(quota.quotaInfo.value.remaining).toBe(0);
      expect(quota.isStorageNearLimit.value).toBe(true);
      expect(quota.isStorageCritical.value).toBe(true);
    });

    it('validateStorageBeforeAction returns appropriate warnings and allowed flag', async () => {
      const quota = useStorageQuota();

      // Normal state
      mockEstimate.mockResolvedValueOnce({
        usage: 10 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
      });
      await quota.checkQuota();
      const validNormal = quota.validateStorageBeforeAction('create note');
      expect(validNormal.allowed).toBe(true);
      expect(validNormal.warning).toBeUndefined();

      // Warning state
      mockEstimate.mockResolvedValueOnce({
        usage: 850 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
      });
      await quota.checkQuota();
      const validWarning = quota.validateStorageBeforeAction('create note');
      expect(validWarning.allowed).toBe(true);
      expect(validWarning.warning).toContain('running low');

      // Critical state
      mockEstimate.mockResolvedValueOnce({
        usage: 980 * 1024 * 1024,
        quota: 1024 * 1024 * 1024,
      });
      await quota.checkQuota();
      const validCritical = quota.validateStorageBeforeAction('create note');
      expect(validCritical.allowed).toBe(true);
      expect(validCritical.warning).toContain('critically low');

      // Exceeded state
      quota.setStorageExceeded();
      const validExceeded = quota.validateStorageBeforeAction('save note');
      expect(validExceeded.allowed).toBe(false);
      expect(validExceeded.warning).toContain('exceeded');
    });

    it('handles unsupported navigator.storage gracefully', async () => {
      vi.stubGlobal('navigator', {});
      const quota = useStorageQuota();
      const info = await quota.checkQuota();

      expect(info.isSupported).toBe(false);
      expect(info.formattedQuota).toBe('N/A');
      expect(info.status).toBe('normal');

      const persisted = await quota.requestPersistence();
      expect(persisted).toBe(false);
    });
  });
});
