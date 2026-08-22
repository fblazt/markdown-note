export type StorageStatus = 'normal' | 'warning' | 'critical' | 'exceeded';

export interface StorageQuotaInfo {
  usage: number; // bytes
  quota: number; // bytes
  remaining: number; // bytes
  percentage: number; // 0-100
  formattedUsage: string; // e.g. "12.4 MB"
  formattedQuota: string; // e.g. "1.2 GB"
  formattedRemaining: string; // e.g. "1.18 GB"
  status: StorageStatus; // warning >= 80% or remaining < 50MB, critical >= 95% or remaining < 10MB
  isPersisted: boolean;
  isSupported: boolean;
}

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  duration?: number; // default 5000ms, 0 for persistent
  action?: ToastAction;
}
