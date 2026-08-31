<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Monitor, Sun, Moon, Check } from 'lucide-vue-next';
import { useTheme, type ThemeSetting } from '../composables/useTheme';

const { themeSetting, setTheme } = useTheme();
const isOpen = ref(false);
const toggleRef = ref<HTMLElement | null>(null);

const currentLabel = computed(() => {
  if (themeSetting.value === 'system') return 'System (Auto)';
  if (themeSetting.value === 'light') return 'Lotus Light';
  return 'Dragon Dark';
});

function toggleDropdown(e: MouseEvent) {
  e.stopPropagation();
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function selectTheme(setting: ThemeSetting) {
  setTheme(setting);
  closeDropdown();
}

function handleClickOutside(event: MouseEvent) {
  if (toggleRef.value && !toggleRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown();
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<template>
  <div ref="toggleRef" class="theme-toggle-wrapper">
    <!-- Trigger Button -->
    <button
      type="button"
      class="btn-icon theme-toggle-btn"
      :class="{ active: isOpen }"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-label="`Current theme: ${currentLabel}. Click to change theme`"
      :title="`Theme: ${currentLabel}`"
      @click="toggleDropdown"
      @keydown.escape="closeDropdown"
    >
      <Monitor v-if="themeSetting === 'system'" :size="16" class="theme-btn-icon" />
      <Sun v-else-if="themeSetting === 'light'" :size="16" class="theme-btn-icon theme-sun" />
      <Moon v-else :size="16" class="theme-btn-icon theme-moon" />
    </button>

    <!-- Dropdown Menu -->
    <transition name="dropdown-fade">
      <div
        v-if="isOpen"
        class="theme-dropdown-menu"
        role="menu"
        aria-orientation="vertical"
        @keydown.escape="closeDropdown"
      >
        <div class="menu-header">
          <span>Appearance</span>
        </div>

        <button
          type="button"
          class="menu-item"
          :class="{ selected: themeSetting === 'system' }"
          role="menuitem"
          @click="selectTheme('system')"
        >
          <Monitor :size="15" class="item-icon" />
          <div class="item-content">
            <span class="item-title">System</span>
            <span class="item-subtitle">Follow OS color preference</span>
          </div>
          <Check v-if="themeSetting === 'system'" :size="14" class="item-check" />
        </button>

        <button
          type="button"
          class="menu-item"
          :class="{ selected: themeSetting === 'light' }"
          role="menuitem"
          @click="selectTheme('light')"
        >
          <Sun :size="15" class="item-icon theme-sun" />
          <div class="item-content">
            <span class="item-title">Lotus Light</span>
            <span class="item-subtitle">Warm cream paper tones</span>
          </div>
          <Check v-if="themeSetting === 'light'" :size="14" class="item-check" />
        </button>

        <button
          type="button"
          class="menu-item"
          :class="{ selected: themeSetting === 'dark' }"
          role="menuitem"
          @click="selectTheme('dark')"
        >
          <Moon :size="15" class="item-icon theme-moon" />
          <div class="item-content">
            <span class="item-title">Dragon Dark</span>
            <span class="item-subtitle">Deep charcoal ink tones</span>
          </div>
          <Check v-if="themeSetting === 'dark'" :size="14" class="item-check" />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.theme-toggle-wrapper {
  position: relative;
  display: inline-flex;
}

.theme-toggle-btn {
  padding: 0.45rem;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.theme-toggle-btn:hover,
.theme-toggle-btn.active {
  background-color: var(--bg-surface-hover);
  color: var(--text-primary);
  border-color: var(--border-focus);
}

.theme-sun {
  color: var(--accent-warning);
}

.theme-moon {
  color: var(--accent-primary);
}

.theme-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 230px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.35rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.menu-header {
  padding: 0.4rem 0.6rem 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
}

.menu-item:hover,
.menu-item:focus {
  background-color: var(--bg-surface-hover);
  outline: none;
}

.menu-item.selected {
  background-color: var(--bg-surface-active);
}

.item-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.item-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.item-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
}

.item-subtitle {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.item-check {
  color: var(--accent-primary);
  flex-shrink: 0;
}

/* Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 767px) {
  .theme-toggle-btn {
    min-width: 40px;
    min-height: 40px;
    padding: 0.5rem;
  }

  .theme-dropdown-menu {
    width: 240px;
    right: 0;
  }

  .menu-item {
    min-height: 42px;
    padding: 0.5rem 0.75rem;
  }

  .item-title {
    font-size: 0.85rem;
  }

  .item-subtitle {
    font-size: 0.72rem;
  }
}
</style>
