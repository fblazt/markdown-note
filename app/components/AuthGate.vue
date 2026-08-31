<template>
  <div class="auth-gate-wrapper">
    <div class="auth-gate-header-bar">
      <ThemeToggle />
    </div>

    <div class="auth-card-container">
      <div class="auth-card">
        <!-- Brand Header -->
        <div class="auth-header">
          <div class="auth-brand">
            <div class="brand-icon-badge">
              <BookOpen :size="24" class="brand-icon" />
            </div>
            <h1 class="brand-title">Markdown Notes</h1>
          </div>
          <p class="auth-subtitle">
            {{ mode === 'login' ? 'Sign in to access your synchronized workspace' : 'Create a new account to get started' }}
          </p>
        </div>

        <!-- Mode Switcher (Tabs) -->
        <div v-if="registrationAllowed" class="auth-tabs" role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            role="tab"
            class="auth-tab-btn"
            :class="{ active: mode === 'login' }"
            :aria-selected="mode === 'login'"
            @click="switchMode('login')"
          >
            <LogIn :size="16" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            class="auth-tab-btn"
            :class="{ active: mode === 'register' }"
            :aria-selected="mode === 'register'"
            @click="switchMode('register')"
          >
            <UserPlus :size="16" />
            <span>Create Account</span>
          </button>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="auth-error-banner"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle :size="16" class="error-icon" />
          <span class="error-text">{{ errorMessage }}</span>
        </div>

        <!-- Auth Form -->
        <form class="auth-form" @submit.prevent="handleSubmit" novalidate>
          <!-- Name Field (Register mode only) -->
          <div v-if="mode === 'register'" class="form-group">
            <label for="auth-name" class="form-label">
              <UserIcon :size="14" class="input-icon" />
              <span>Full Name</span>
            </label>
            <input
              id="auth-name"
              v-model="name"
              type="text"
              class="input-text auth-input"
              placeholder="e.g. Jane Developer"
              required
              autocomplete="name"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Email Field -->
          <div class="form-group">
            <label for="auth-email" class="form-label">
              <Mail :size="14" class="input-icon" />
              <span>Email Address</span>
            </label>
            <input
              id="auth-email"
              v-model="email"
              type="email"
              class="input-text auth-input"
              placeholder="developer@example.com"
              required
              autocomplete="email"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="auth-password" class="form-label">
              <Lock :size="14" class="input-icon" />
              <span>Password</span>
              <span v-if="mode === 'register'" class="form-hint">(min 8 characters)</span>
            </label>
            <input
              id="auth-password"
              v-model="password"
              type="password"
              class="input-text auth-input"
              :placeholder="mode === 'register' ? '••••••••••••' : 'Enter your password'"
              required
              minlength="8"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="btn btn-primary auth-submit-btn"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" :size="16" class="spin-icon" />
            <LogIn v-else-if="mode === 'login'" :size="16" />
            <UserPlus v-else :size="16" />
            <span>{{ isSubmitting ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account') }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  BookOpen,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
} from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';
import ThemeToggle from './ThemeToggle.vue';

const emit = defineEmits<{
  (e: 'authenticated'): void;
}>();

const { login, register, registrationAllowed } = useAuth();

const mode = ref<'login' | 'register'>('login');
const name = ref('');
const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

// Auto fallback to login if registration is disabled
watch(
  registrationAllowed,
  (allowed) => {
    if (!allowed && mode.value === 'register') {
      mode.value = 'login';
    }
  },
  { immediate: true }
);

function switchMode(newMode: 'login' | 'register') {
  if (isSubmitting.value) return;
  mode.value = newMode;
  errorMessage.value = '';
}

async function handleSubmit() {
  if (isSubmitting.value) return;
  errorMessage.value = '';

  const cleanEmail = email.value.trim();
  const cleanPassword = password.value;
  const cleanName = name.value.trim();

  if (!cleanEmail) {
    errorMessage.value = 'Please enter your email address.';
    return;
  }
  if (!cleanPassword) {
    errorMessage.value = 'Please enter your password.';
    return;
  }
  if (mode.value === 'register') {
    if (!cleanName) {
      errorMessage.value = 'Please enter your name.';
      return;
    }
    if (cleanPassword.length < 8) {
      errorMessage.value = 'Password must be at least 8 characters long.';
      return;
    }
  }

  isSubmitting.value = true;

  try {
    if (mode.value === 'login') {
      await login(cleanEmail, cleanPassword);
    } else {
      await register(cleanEmail, cleanName, cleanPassword);
    }
    emit('authenticated');
  } catch (err: any) {
    errorMessage.value =
      err?.message || err?.statusMessage || 'Authentication failed. Please check your credentials and try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.auth-gate-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--bg-app);
  position: relative;
  overflow-y: auto;
}

.auth-gate-header-bar {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  z-index: 10;
}

.auth-card-container {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: auth-card-fade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes auth-card-fade {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
}

.brand-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.auth-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 320px;
  line-height: 1.4;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  gap: 0.25rem;
}

.auth-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.825rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.auth-tab-btn:hover {
  color: var(--text-primary);
}

.auth-tab-btn.active {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}

/* Error Banner */
.auth-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background-color: rgba(196, 116, 110, 0.12);
  border: 1px solid var(--accent-danger);
  border-radius: var(--radius-md);
  color: var(--accent-danger);
  font-size: 0.825rem;
  line-height: 1.4;
}

.error-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.error-text {
  word-break: break-word;
}

/* Form Styles */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.775rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.725rem;
}

.input-icon {
  color: var(--text-muted);
}

.auth-input {
  padding: 0.6rem 0.85rem;
  font-size: 0.875rem;
}

.auth-submit-btn {
  width: 100%;
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.auth-submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spin-icon {
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

@media (max-width: 480px) {
  .auth-card {
    padding: 1.5rem 1.25rem;
    border-radius: var(--radius-md);
  }

  .auth-brand {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
