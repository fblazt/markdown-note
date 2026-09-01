import type { Toast, ToastType, ToastAction } from '../../shared/types/storage';

export interface ShowToastOptions {
  id?: string;
  title: string;
  message: string;
  type?: ToastType;
  duration?: number; // default 5000ms, 0 for persistent
  action?: ToastAction;
}

// Singleton state for toasts
const toasts = ref<Toast[]>([]);
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function useToast() {
  function removeToast(id: string): void {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function showToast(options: ShowToastOptions): string {
    const id =
      options.id ||
      `toast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const duration = options.duration !== undefined ? options.duration : 5000;
    const type = options.type || 'info';

    // If a toast with the same ID already exists, remove it first
    removeToast(id);

    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      type,
      duration,
      action: options.action,
    };

    toasts.value.push(toast);

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }

    return id;
  }

  function clearAllToasts(): void {
    for (const timer of toastTimers.values()) {
      clearTimeout(timer);
    }
    toastTimers.clear();
    toasts.value = [];
  }

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
  };
}
