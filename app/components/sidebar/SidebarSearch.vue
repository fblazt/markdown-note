<script setup lang="ts">
import { Search, X } from 'lucide-vue-next';

const {
  searchQuery,
  selectedTag,
  allTags,
  toggleTagFilter,
} = useNotes();
</script>

<template>
  <div class="sidebar-search-area">
    <div class="search-box">
      <Search class="search-icon" :size="15" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search notes or tags..."
        class="search-input"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="btn-clear-search"
        title="Clear search"
        aria-label="Clear search"
        @click="searchQuery = ''"
      >
        <X :size="14" />
      </button>
    </div>

    <!-- Tag Filter Chips -->
    <div v-if="allTags.length > 0" class="tags-filter-scroll">
      <button
        type="button"
        class="tag-filter-pill"
        :class="{ active: selectedTag === null }"
        @click="selectedTag = null"
      >
        All
      </button>
      <button
        v-for="tag in allTags"
        :key="tag"
        type="button"
        class="tag-filter-pill"
        :class="{ active: selectedTag === tag }"
        @click="toggleTagFilter(tag)"
      >
        #{{ tag }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar-search-area {
  padding: 0.65rem 0.85rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background-color: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.4rem 1.8rem 0.4rem 2rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.15s ease;
}

.search-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px var(--border-subtle);
}

.btn-clear-search {
  position: absolute;
  right: 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 50%;
}

.btn-clear-search:hover {
  color: var(--text-primary);
  background-color: var(--bg-surface-hover);
}

.tags-filter-scroll {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tags-filter-scroll::-webkit-scrollbar {
  display: none;
}

.tag-filter-pill {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.tag-filter-pill:hover {
  background: var(--bg-surface-hover);
  color: var(--text-primary);
}

.tag-filter-pill.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-inverse);
}
</style>
