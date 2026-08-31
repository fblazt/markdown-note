<script setup lang="ts">
import { Loader2, Check, Clock, AlertCircle } from 'lucide-vue-next';
import type { SaveStatus } from '../../../shared/types/note';

defineProps<{
  saveStatus: SaveStatus;
}>();
</script>

<template>
  <div class="save-status-indicator">
    <span v-if="saveStatus === 'saving'" class="status-badge saving">
      <Loader2 class="icon-spin" :size="13" /> Saving...
    </span>
    <span v-else-if="saveStatus === 'saved'" class="status-badge saved">
      <Check :size="13" /> Saved
    </span>
    <span v-else-if="saveStatus === 'unsaved'" class="status-badge unsaved">
      <Clock :size="13" /> Unsaved
    </span>
    <span v-else-if="saveStatus === 'error'" class="status-badge error">
      <AlertCircle :size="13" /> Error saving
    </span>
  </div>
</template>

<style scoped>
.save-status-indicator {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.72rem;
}

.status-badge.saving {
  color: var(--accent-primary);
  background-color: var(--bg-surface);
}

.status-badge.saved {
  color: var(--accent-success);
  background-color: rgba(94, 143, 110, 0.1);
}

.status-badge.unsaved {
  color: var(--accent-warning);
  background-color: rgba(229, 192, 123, 0.1);
}

.status-badge.error {
  color: var(--accent-danger);
  background-color: rgba(196, 116, 110, 0.15);
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
