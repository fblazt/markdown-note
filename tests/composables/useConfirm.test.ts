import { describe, it, expect, beforeEach } from 'vitest';
import { useConfirm } from '../../app/composables/useConfirm';

describe('Composable: useConfirm', () => {
  let composable: ReturnType<typeof useConfirm>;

  beforeEach(() => {
    composable = useConfirm();
    composable.handleCancel(); // Reset any open state
  });

  it('initializes with closed state', () => {
    expect(composable.isOpen.value).toBe(false);
  });

  it('opens dialog with string shorthand and resolves true on confirm', async () => {
    const promise = composable.confirm('Are you sure?');
    expect(composable.isOpen.value).toBe(true);
    expect(composable.dialogOptions.value.message).toBe('Are you sure?');
    expect(composable.options.value.message).toBe('Are you sure?');
    expect(composable.dialogOptions.value.title).toBe('Confirm Action');

    composable.handleConfirm();
    const result = await promise;
    expect(result).toBe(true);
    expect(composable.isOpen.value).toBe(false);
  });

  it('opens dialog with options and resolves false on cancel', async () => {
    const promise = composable.confirm({
      title: 'Delete Note',
      message: 'Delete this note?',
      itemTitle: 'My Note',
      confirmText: 'Delete',
      cancelText: 'Keep',
      variant: 'danger',
    });

    expect(composable.isOpen.value).toBe(true);
    expect(composable.dialogOptions.value.title).toBe('Delete Note');
    expect(composable.dialogOptions.value.itemTitle).toBe('My Note');
    expect(composable.dialogOptions.value.confirmText).toBe('Delete');
    expect(composable.dialogOptions.value.cancelText).toBe('Keep');
    expect(composable.dialogOptions.value.variant).toBe('danger');
    expect(composable.dialogOptions.value.icon).toBe('trash');

    composable.handleCancel();
    const result = await promise;
    expect(result).toBe(false);
    expect(composable.isOpen.value).toBe(false);
  });

  it('cancels previous pending dialog when a new one is opened', async () => {
    const firstPromise = composable.confirm('First dialog');
    const secondPromise = composable.confirm('Second dialog');

    const firstResult = await firstPromise;
    expect(firstResult).toBe(false);

    expect(composable.isOpen.value).toBe(true);
    expect(composable.dialogOptions.value.message).toBe('Second dialog');

    composable.handleConfirm();
    const secondResult = await secondPromise;
    expect(secondResult).toBe(true);
    expect(composable.isOpen.value).toBe(false);
  });

  it('sets appropriate default icons and titles based on variant', () => {
    composable.confirm({ message: 'Warning msg', variant: 'warning' });
    expect(composable.dialogOptions.value.icon).toBe('alert');
    expect(composable.dialogOptions.value.title).toBe('Confirm Action');

    composable.confirm({ message: 'Info msg', variant: 'info' });
    expect(composable.dialogOptions.value.icon).toBe('info');
    expect(composable.dialogOptions.value.title).toBe('Confirm Action');

    composable.confirm({ message: 'Danger msg', variant: 'danger' });
    expect(composable.dialogOptions.value.icon).toBe('trash');
    expect(composable.dialogOptions.value.title).toBe('Delete Confirmation');
  });

  it('allows custom icon override', () => {
    composable.confirm({ message: 'Custom icon', variant: 'info', icon: 'alert' });
    expect(composable.dialogOptions.value.icon).toBe('alert');
  });
});
