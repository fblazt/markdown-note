<script setup lang="ts">
import { HardDrive } from 'lucide-vue-next';
import { getWordCount, getCharCount, getReadingTime } from '../../utils/markdown';

const { notes, activeNote } = useNotes();
const { quotaInfo } = useStorageQuota();

const wordCount = computed(() => {
  return activeNote.value ? getWordCount(activeNote.value.content) : 0;
});

const charCount = computed(() => {
  return activeNote.value ? getCharCount(activeNote.value.content) : 0;
});

const readingTime = computed(() => {
  return activeNote.value ? getReadingTime(activeNote.value.content) : 0;
});
</script>

<template>
  <footer class="status-bar">
    <div class="status-right">
      <SyncStatusBadge />
      <span class="status-separator status-sync-separator">•</span>

      <template v-if="activeNote">
        <span class="status-stat">{{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}</span>
        <span class="status-separator status-stat-extra">•</span>
        <span class="status-stat status-stat-extra">{{ charCount }} {{ charCount === 1 ? 'char' : 'chars' }}</span>
        <span class="status-separator status-stat-extra">•</span>
        <span class="status-stat status-stat-extra">~{{ readingTime }} min read</span>
        <span class="status-separator">•</span>
      </template>

      <template v-if="quotaInfo.isSupported">
        <span
          class="status-storage-summary"
          :class="`status-quota-${quotaInfo.status}`"
        >
          <HardDrive :size="12" />
          <span>{{ quotaInfo.formattedUsage }} / {{ quotaInfo.formattedQuota }} ({{ Math.round(quotaInfo.percentage) }}%)</span>
        </span>
        <span class="status-separator status-storage-separator">•</span>
      </template>

      <span class="status-notes-total">{{ notes.length }} notes</span>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.25rem 1rem;
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  font-size: 0.72rem;
  color: var(--text-muted);
  height: var(--status-bar-height, 28px);
  min-height: var(--status-bar-height, 28px);
}

.status-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-separator {
  color: var(--border-subtle);
  font-size: 0.65rem;
  user-select: none;
}

.status-stat {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.72rem;
  white-space: nowrap;
}

.status-notes-total {
  font-weight: 500;
  font-size: 0.72rem;
  white-space: nowrap;
}

.status-storage-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.status-quota-warning {
  color: var(--accent-warning);
}

.status-quota-critical,
.status-quota-exceeded {
  color: var(--accent-danger);
}
</style>
