<template>
  <div
    class="toast-container"
    aria-live="polite"
    aria-atomic="true"
    role="region"
    aria-label="Notifications"
  >
    <transition-group name="toast-item" tag="div" class="toast-list">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-${toast.type}`"
        role="status"
      >
        <div class="toast-icon-wrapper">
          <Info v-if="toast.type === 'info'" :size="18" class="toast-icon" />
          <CheckCircle2
            v-else-if="toast.type === 'success'"
            :size="18"
            class="toast-icon"
          />
          <AlertTriangle
            v-else-if="toast.type === 'warning'"
            :size="18"
            class="toast-icon"
          />
          <AlertOctagon
            v-else-if="toast.type === 'danger'"
            :size="18"
            class="toast-icon"
          />
        </div>

        <div class="toast-body">
          <h4 v-if="toast.title" class="toast-title">{{ toast.title }}</h4>
          <p class="toast-message">{{ toast.message }}</p>

          <div v-if="toast.action" class="toast-actions">
            <button
              type="button"
              class="btn-toast-action"
              @click="handleActionClick(toast)"
            >
              {{ toast.action.label }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="toast-close-btn"
          title="Dismiss notification"
          aria-label="Dismiss notification"
          @click="removeToast(toast.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
} from 'lucide-vue-next';
import { useToast } from '../composables/useToast';
import type { Toast } from '../../shared/types/storage';

const { toasts, removeToast } = useToast();

function handleActionClick(toast: Toast) {
  if (toast.action) {
    toast.action.onClick();
    removeToast(toast.id);
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: calc(var(--status-height) + 1rem);
  right: 1.25rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  pointer-events: none;
  max-width: 400px;
  width: calc(100vw - 2.5rem);
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  width: 100%;
}

.toast-card {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  width: 100%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
  box-sizing: border-box;
}

/* Toast Color Variants */
.toast-info {
  border-left: 4px solid var(--accent-primary);
}
.toast-info .toast-icon {
  color: var(--accent-primary);
}

.toast-success {
  border-left: 4px solid var(--accent-success);
}
.toast-success .toast-icon {
  color: var(--accent-success);
}

.toast-warning {
  border-left: 4px solid var(--accent-warning);
}
.toast-warning .toast-icon {
  color: var(--accent-warning);
}

.toast-danger {
  border-left: 4px solid var(--accent-danger);
}
.toast-danger .toast-icon {
  color: var(--accent-danger);
}

.toast-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding-top: 0.1rem;
}

.toast-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.toast-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.toast-message {
  font-size: 0.775rem;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

.toast-actions {
  margin-top: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-toast-action {
  background-color: var(--bg-surface-hover);
  border: 1px solid var(--border-subtle);
  color: var(--accent-primary);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-toast-action:hover {
  background-color: var(--bg-surface-active);
  color: var(--accent-primary-hover);
  border-color: var(--accent-primary);
}

.toast-close-btn {
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
  flex-shrink: 0;
}

.toast-close-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

/* Animations */
.toast-item-enter-active,
.toast-item-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-item-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}

.toast-item-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

@media (max-width: 767px) {
  .toast-container {
    right: 0.75rem;
    left: 0.75rem;
    width: auto;
    max-width: none;
    bottom: calc(var(--status-height) + 0.75rem);
  }

  .toast-card {
    padding: 0.75rem 0.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast-card,
  .toast-item-enter-active,
  .toast-item-leave-active {
    transition: none !important;
  }
}
</style>
