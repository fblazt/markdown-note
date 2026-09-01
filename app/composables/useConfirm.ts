export interface ConfirmOptions {
  title?: string;
  message: string;
  itemTitle?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: 'trash' | 'alert' | 'info';
}

const isOpen = ref(false);
const options = ref<ConfirmOptions>({
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  icon: 'trash',
});

let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirm() {
  function confirm(opts: ConfirmOptions | string): Promise<boolean> {
    // If a dialog is already open, cancel the previous one
    if (resolvePromise) {
      resolvePromise(false);
      resolvePromise = null;
    }

    if (typeof opts === 'string') {
      options.value = {
        title: 'Confirm Action',
        message: opts,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'danger',
        icon: 'trash',
      };
    } else {
      const variant = opts.variant || 'danger';
      const defaultIcon = variant === 'danger' ? 'trash' : variant === 'warning' ? 'alert' : 'info';
      options.value = {
        title: opts.title || (variant === 'danger' ? 'Delete Confirmation' : 'Confirm Action'),
        message: opts.message || '',
        itemTitle: opts.itemTitle,
        confirmText: opts.confirmText || (variant === 'danger' ? 'Delete' : 'Confirm'),
        cancelText: opts.cancelText || 'Cancel',
        variant,
        icon: opts.icon || defaultIcon,
      };
    }

    isOpen.value = true;

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
  }

  function handleConfirm() {
    isOpen.value = false;
    if (resolvePromise) {
      resolvePromise(true);
      resolvePromise = null;
    }
  }

  function handleCancel() {
    isOpen.value = false;
    if (resolvePromise) {
      resolvePromise(false);
      resolvePromise = null;
    }
  }

  const readonlyOptions = readonly(options);

  return {
    isOpen: readonly(isOpen),
    options: readonlyOptions,
    dialogOptions: readonlyOptions,
    confirm,
    handleConfirm,
    handleCancel,
  };
}
