import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToast } from '../../app/composables/useToast';

describe('Composable: useToast', () => {
  let toastComposable: ReturnType<typeof useToast>;

  beforeEach(() => {
    vi.useRealTimers();
    toastComposable = useToast();
    toastComposable.clearAllToasts();
  });

  afterEach(() => {
    vi.useRealTimers();
    toastComposable.clearAllToasts();
  });

  it('adds a toast with default options and generates an ID', () => {
    const id = toastComposable.showToast({
      title: 'Note Saved',
      message: 'Your changes have been saved successfully.',
    });

    expect(id).toBeDefined();
    expect(toastComposable.toasts.value.length).toBe(1);
    expect(toastComposable.toasts.value[0]?.id).toBe(id);
    expect(toastComposable.toasts.value[0]?.title).toBe('Note Saved');
    expect(toastComposable.toasts.value[0]?.message).toBe('Your changes have been saved successfully.');
    expect(toastComposable.toasts.value[0]?.type).toBe('info');
    expect(toastComposable.toasts.value[0]?.duration).toBe(5000);
  });

  it('supports custom types, durations, and explicit IDs', () => {
    const customId = 'custom-storage-warning';
    toastComposable.showToast({
      id: customId,
      title: 'Warning Title',
      message: 'Warning Message',
      type: 'warning',
      duration: 3000,
    });

    expect(toastComposable.toasts.value.length).toBe(1);
    const toast = toastComposable.toasts.value[0]!;
    expect(toast.id).toBe(customId);
    expect(toast.type).toBe('warning');
    expect(toast.duration).toBe(3000);
  });

  it('replaces an existing toast if the same ID is provided', () => {
    toastComposable.showToast({
      id: 'unique-id',
      title: 'First',
      message: 'First msg',
    });

    toastComposable.showToast({
      id: 'unique-id',
      title: 'Second',
      message: 'Updated msg',
      type: 'success',
    });

    expect(toastComposable.toasts.value.length).toBe(1);
    expect(toastComposable.toasts.value[0]?.title).toBe('Second');
    expect(toastComposable.toasts.value[0]?.type).toBe('success');
  });

  it('removes toast by ID via removeToast()', () => {
    const id1 = toastComposable.showToast({ title: 'T1', message: 'M1' });
    const id2 = toastComposable.showToast({ title: 'T2', message: 'M2' });

    expect(toastComposable.toasts.value.length).toBe(2);

    toastComposable.removeToast(id1);

    expect(toastComposable.toasts.value.length).toBe(1);
    expect(toastComposable.toasts.value[0]?.id).toBe(id2);
  });

  it('auto-dismisses toast after duration expires', async () => {
    vi.useFakeTimers();

    toastComposable.showToast({
      title: 'Auto Dismiss',
      message: 'Will vanish in 2000ms',
      duration: 2000,
    });

    expect(toastComposable.toasts.value.length).toBe(1);

    // Fast-forward 1000ms -> still present
    vi.advanceTimersByTime(1000);
    expect(toastComposable.toasts.value.length).toBe(1);

    // Fast-forward past 2000ms -> auto-dismissed
    vi.advanceTimersByTime(1100);
    expect(toastComposable.toasts.value.length).toBe(0);
  });

  it('does not auto-dismiss persistent toasts when duration is 0', () => {
    vi.useFakeTimers();

    toastComposable.showToast({
      title: 'Persistent Danger',
      message: 'Requires user action',
      type: 'danger',
      duration: 0,
    });

    expect(toastComposable.toasts.value.length).toBe(1);

    // Fast forward a long time
    vi.advanceTimersByTime(100000);
    expect(toastComposable.toasts.value.length).toBe(1);
  });

  it('supports action callback payload', () => {
    const actionSpy = vi.fn();

    toastComposable.showToast({
      title: 'Storage Full',
      message: 'Export backup?',
      action: {
        label: 'Export Now',
        onClick: actionSpy,
      },
    });

    const toast = toastComposable.toasts.value[0]!;
    expect(toast.action).toBeDefined();
    expect(toast.action?.label).toBe('Export Now');

    toast.action?.onClick();
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });

  it('clears all toasts and timers on clearAllToasts()', () => {
    toastComposable.showToast({ title: 'T1', message: 'M1' });
    toastComposable.showToast({ title: 'T2', message: 'M2' });
    toastComposable.showToast({ title: 'T3', message: 'M3' });

    expect(toastComposable.toasts.value.length).toBe(3);

    toastComposable.clearAllToasts();
    expect(toastComposable.toasts.value.length).toBe(0);
  });
});
