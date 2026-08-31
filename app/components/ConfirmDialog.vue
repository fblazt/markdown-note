<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { Trash2, AlertTriangle, Info, X, FileText } from 'lucide-vue-next';
import { useConfirm } from '../composables/useConfirm';

const { isOpen, options, handleConfirm, handleCancel } = useConfirm();

const dialogRef = ref<HTMLElement | null>(null);
const cancelBtnRef = ref<HTMLButtonElement | null>(null);
const confirmBtnRef = ref<HTMLButtonElement | null>(null);

let previousActiveElement: HTMLElement | null = null;

function handleBackdropClick() {
  handleCancel();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    handleCancel();
    return;
  }

  // Focus trap inside dialog
  if (e.key === 'Tab' && dialogRef.value) {
    const focusable = dialogRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first && last) {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (isOpen.value && e.key === 'Escape') {
    e.preventDefault();
    handleCancel();
  }
}

watch(isOpen, async (open) => {
  if (typeof document === 'undefined') return;

  if (open) {
    previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    await nextTick();
    // For destructive actions, focus cancel button by default to prevent accidental deletion
    if (cancelBtnRef.value) {
      cancelBtnRef.value.focus();
    } else if (dialogRef.value) {
      dialogRef.value.focus();
    }
  } else {
    document.body.style.overflow = '';
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  }
});

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleGlobalKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleGlobalKeydown);
  }
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});
</script>

<template>
  <Teleport to="body">
    <transition name="dialog-fade">
      <div
        v-if="isOpen"
        class="dialog-overlay modal-backdrop"
        role="presentation"
        @click.self="handleBackdropClick"
      >
        <div
          ref="dialogRef"
          class="dialog-modal modal-card"
          :class="`dialog-variant-${options.variant || 'danger'}`"
          :role="options.variant === 'danger' ? 'alertdialog' : 'dialog'"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <!-- Header -->
          <div class="dialog-header">
            <div class="dialog-header-left">
              <div class="dialog-icon-badge" :class="`badge-${options.variant || 'danger'}`">
                <Trash2 v-if="options.icon === 'trash'" :size="18" />
                <AlertTriangle v-else-if="options.icon === 'alert'" :size="18" />
                <Info v-else :size="18" />
              </div>
              <h3 id="dialog-title" class="dialog-title">
                {{ options.title }}
              </h3>
            </div>
            <button
              type="button"
              class="btn-icon dialog-btn-close"
              aria-label="Close dialog"
              @click="handleCancel"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- Body -->
          <div class="dialog-body">
            <p id="dialog-description" class="dialog-message">
              {{ options.message }}
            </p>

            <div v-if="options.itemTitle" class="dialog-item-chip dialog-item-title">
              <FileText :size="14" class="item-chip-icon" />
              <span class="item-chip-text">{{ options.itemTitle }}</span>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="dialog-footer">
            <button
              ref="cancelBtnRef"
              type="button"
              class="btn btn-secondary dialog-btn-cancel"
              @click="handleCancel"
            >
              {{ options.cancelText || 'Cancel' }}
            </button>
            <button
              ref="confirmBtnRef"
              type="button"
              class="btn dialog-btn-confirm"
              :class="options.variant === 'danger' ? 'btn-danger' : 'btn-primary'"
              @click="handleConfirm"
            >
              <Trash2 v-if="options.variant === 'danger' && options.icon === 'trash'" :size="14" />
              <span>{{ options.confirmText || 'Confirm' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.dialog-modal {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
  animation: dialog-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialog-pop {
  0% {
    opacity: 0;
    transform: scale(0.94) translateY(4px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.25rem 0.85rem;
  border-bottom: 1px solid var(--border-color);
  gap: 0.75rem;
}

.dialog-header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.dialog-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge-danger {
  background-color: rgba(196, 116, 110, 0.15);
  color: var(--accent-danger);
  border: 1px solid rgba(196, 116, 110, 0.3);
}

.badge-warning {
  background-color: rgba(200, 179, 126, 0.15);
  color: var(--accent-warning);
  border: 1px solid rgba(200, 179, 126, 0.3);
}

.badge-info {
  background-color: rgba(139, 164, 176, 0.15);
  color: var(--accent-primary);
  border: 1px solid rgba(139, 164, 176, 0.3);
}

.dialog-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.dialog-btn-close {
  color: var(--text-muted);
  flex-shrink: 0;
}

.dialog-btn-close:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
}

.dialog-body {
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.dialog-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.dialog-item-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
}

.item-chip-icon {
  color: var(--accent-primary);
  flex-shrink: 0;
}

.item-chip-text {
  font-size: 0.825rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem 1.15rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-app);
}

.btn-danger {
  background-color: var(--accent-danger);
  color: var(--text-inverse);
  border-color: transparent;
}

.btn-danger:hover {
  background-color: var(--accent-danger-hover);
  transform: translateY(-1px);
}

.dialog-btn-cancel {
  padding: 0.45rem 0.95rem;
  font-size: 0.825rem;
}

.dialog-btn-confirm {
  padding: 0.45rem 1rem;
  font-size: 0.825rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .dialog-modal {
    max-width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    animation: dialog-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes dialog-slide-up {
    0% {
      opacity: 0;
      transform: translateY(100%);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dialog-footer {
    flex-direction: column-reverse;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1.25rem;
  }

  .dialog-btn-cancel,
  .dialog-btn-confirm {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }
}
</style>
