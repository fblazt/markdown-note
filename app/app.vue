<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import { useAuth } from './composables/useAuth';
import { useNotes } from './composables/useNotes';
import { useTheme } from './composables/useTheme';
import { useSync } from './composables/useSync';
import AuthGate from './components/AuthGate.vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppWorkspace from './components/layout/AppWorkspace.vue';
import AppStatusBar from './components/layout/AppStatusBar.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastContainer from './components/ToastContainer.vue';
import ProfileModal from './components/ProfileModal.vue';

const isProfileOpen = ref(false);

const {
  isAuthenticated,
  isInitializing,
  initAuth,
} = useAuth();

const {
  fetchNotes,
  createNote,
  checkMobile,
} = useNotes();

const { initTheme } = useTheme();
const { initSSE, closeSSE } = useSync();

async function handleAuthenticated() {
  await fetchNotes();
  initSSE();
}

async function handleCreateNote() {
  await createNote({
    title: 'Untitled Note',
    content: '# New Note\n\nStart writing here...',
    tags: [],
  });
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (!isAuthenticated.value) return;
  // Ctrl+N or Cmd+N: create new note
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
    e.preventDefault();
    handleCreateNote();
  }
}

watch(isAuthenticated, (authed) => {
  if (!authed) {
    closeSSE();
  }
});

onMounted(async () => {
  initTheme();
  checkMobile();
  await initAuth();
  if (isAuthenticated.value) {
    await fetchNotes();
    initSSE();
  }
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  closeSSE();
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <!-- Startup Loading Screen -->
  <div v-if="isInitializing" class="app-loading-screen">
    <div class="loading-spinner-wrapper">
      <Loader2 :size="36" class="loading-spinner" />
      <span class="loading-label">Loading Markdown Notes...</span>
    </div>
  </div>

  <!-- Authentication Gate -->
  <AuthGate v-else-if="!isAuthenticated" @authenticated="handleAuthenticated" />

  <!-- Main Application Shell -->
  <div v-else class="app-container">
    <AppHeader
      @open-profile="isProfileOpen = true"
      @create-note="handleCreateNote"
    />

    <AppWorkspace />

    <AppStatusBar />

    <!-- Global Confirmation Dialog Modal -->
    <ConfirmDialog />

    <!-- User Profile & Account Settings Modal -->
    <ProfileModal v-if="isProfileOpen" @close="isProfileOpen = false" />

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<style scoped>
.app-loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  height: 100dvh;
  background-color: var(--bg-app);
  color: var(--text-primary);
}

.loading-spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  color: var(--accent-primary);
  animation: loading-spin 1s linear infinite;
}

.loading-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

@keyframes loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
