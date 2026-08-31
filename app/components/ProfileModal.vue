<template>
  <Teleport to="body">
    <transition name="dialog-fade">
      <div
        class="dialog-overlay modal-backdrop"
        role="presentation"
        @click.self="handleClose"
      >
        <div
          ref="modalRef"
          class="dialog-modal modal-card profile-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <!-- Header -->
          <div class="dialog-header">
            <div class="dialog-header-left">
              <div class="dialog-icon-badge badge-info">
                <User :size="18" />
              </div>
              <h3 id="profile-modal-title" class="dialog-title">
                Account Settings
              </h3>
            </div>
            <button
              ref="headerCloseBtnRef"
              type="button"
              class="btn-icon dialog-btn-close btn-close-modal"
              aria-label="Close account settings"
              @click="handleClose"
            >
              <X :size="16" />
            </button>
          </div>

          <!-- Body -->
          <div class="dialog-body profile-modal-body">
            <!-- User Info Banner -->
            <div class="profile-user-banner">
              <div class="user-avatar-badge">
                <User :size="24" />
              </div>
              <div class="user-info-text">
                <h4 class="profile-user-name">{{ user?.name || 'User' }}</h4>
                <span class="profile-user-email">{{ user?.email || '' }}</span>
                <span class="profile-member-since">
                  <Calendar :size="12" class="member-since-icon" />
                  <span>{{ memberSinceText }}</span>
                </span>
              </div>
            </div>

            <!-- Tab Navigation -->
            <div class="profile-tabs" role="tablist" aria-label="Account Settings Sections">
              <button
                type="button"
                role="tab"
                class="profile-tab-btn"
                :class="{ active: activeTab === 'profile' }"
                :aria-selected="activeTab === 'profile'"
                data-tab="profile"
                @click="switchTab('profile')"
              >
                <User :size="15" />
                <span>Profile Details</span>
              </button>
              <button
                type="button"
                role="tab"
                class="profile-tab-btn"
                :class="{ active: activeTab === 'security' }"
                :aria-selected="activeTab === 'security'"
                data-tab="security"
                @click="switchTab('security')"
              >
                <KeyRound :size="15" />
                <span>Security</span>
              </button>
            </div>

            <!-- Tab 1: Profile Details Form -->
            <div v-show="activeTab === 'profile'" class="profile-tab-content">
              <form class="modal-form profile-form" @submit.prevent="handleUpdateProfile" novalidate>
                <!-- Full Name -->
                <div class="form-group">
                  <label for="profile-name" class="form-label">
                    <User :size="14" class="input-icon" />
                    <span>Full Name</span>
                  </label>
                  <input
                    id="profile-name"
                    v-model="nameInput"
                    type="text"
                    class="input-text profile-input input-name"
                    placeholder="e.g. Jane Developer"
                    required
                    autocomplete="name"
                    :disabled="isUpdatingProfile"
                  />
                </div>

                <!-- Email Address -->
                <div class="form-group">
                  <label for="profile-email" class="form-label">
                    <Mail :size="14" class="input-icon" />
                    <span>Email Address</span>
                  </label>
                  <input
                    id="profile-email"
                    v-model="emailInput"
                    type="email"
                    class="input-text profile-input input-email"
                    placeholder="developer@example.com"
                    required
                    autocomplete="email"
                    :disabled="isUpdatingProfile"
                  />
                </div>

                <!-- Profile Success Alert -->
                <div
                  v-if="profileSuccess"
                  class="profile-alert profile-alert-success"
                  role="status"
                  aria-live="polite"
                >
                  <Check :size="15" class="alert-icon" />
                  <span class="alert-text">{{ profileSuccess }}</span>
                </div>

                <!-- Profile Error Alert -->
                <div
                  v-if="profileError"
                  class="profile-alert profile-alert-error"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle :size="15" class="alert-icon" />
                  <span class="alert-text">{{ profileError }}</span>
                </div>

                <!-- Submit Button -->
                <div class="form-actions">
                  <button
                    type="submit"
                    class="btn btn-primary btn-update-profile"
                    :disabled="isUpdatingProfile"
                  >
                    <Loader2 v-if="isUpdatingProfile" :size="15" class="spin-icon" />
                    <Check v-else :size="15" />
                    <span>{{ isUpdatingProfile ? 'Updating Profile...' : 'Update Profile' }}</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Tab 2: Security & Password Form -->
            <div v-show="activeTab === 'security'" class="profile-tab-content">
              <form class="modal-form password-form" @submit.prevent="handleChangePassword" novalidate>
                <!-- Current Password -->
                <div class="form-group">
                  <label for="current-password" class="form-label">
                    <KeyRound :size="14" class="input-icon" />
                    <span>Current Password</span>
                  </label>
                  <input
                    id="current-password"
                    v-model="currentPassword"
                    type="password"
                    class="input-text profile-input input-current-password"
                    placeholder="Enter your current password"
                    required
                    autocomplete="current-password"
                    :disabled="isChangingPassword"
                  />
                </div>

                <!-- New Password -->
                <div class="form-group">
                  <label for="new-password" class="form-label">
                    <KeyRound :size="14" class="input-icon" />
                    <span>New Password</span>
                    <span class="form-hint">(min 8 characters)</span>
                  </label>
                  <input
                    id="new-password"
                    v-model="newPassword"
                    type="password"
                    class="input-text profile-input input-new-password"
                    placeholder="••••••••••••"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    :disabled="isChangingPassword"
                  />
                </div>

                <!-- Confirm New Password -->
                <div class="form-group">
                  <label for="confirm-password" class="form-label">
                    <KeyRound :size="14" class="input-icon" />
                    <span>Confirm New Password</span>
                  </label>
                  <input
                    id="confirm-password"
                    v-model="confirmPassword"
                    type="password"
                    class="input-text profile-input input-confirm-password"
                    placeholder="••••••••••••"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    :disabled="isChangingPassword"
                  />
                </div>

                <!-- Password Success Alert -->
                <div
                  v-if="passwordSuccess"
                  class="profile-alert profile-alert-success password-alert-success"
                  role="status"
                  aria-live="polite"
                >
                  <Check :size="15" class="alert-icon" />
                  <span class="alert-text">{{ passwordSuccess }}</span>
                </div>

                <!-- Password Error Alert -->
                <div
                  v-if="passwordError"
                  class="profile-alert profile-alert-error password-alert-error"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle :size="15" class="alert-icon" />
                  <span class="alert-text">{{ passwordError }}</span>
                </div>

                <!-- Submit Button -->
                <div class="form-actions">
                  <button
                    type="submit"
                    class="btn btn-primary btn-change-password"
                    :disabled="isChangingPassword"
                  >
                    <Loader2 v-if="isChangingPassword" :size="15" class="spin-icon" />
                    <KeyRound v-else :size="15" />
                    <span>{{ isChangingPassword ? 'Changing Password...' : 'Change Password' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="dialog-footer profile-modal-footer">
            <button
              type="button"
              class="btn btn-danger btn-signout"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              <Loader2 v-if="isLoggingOut" :size="14" class="spin-icon" />
              <LogOut v-else :size="14" />
              <span>{{ isLoggingOut ? 'Signing out...' : 'Sign Out' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  User,
  Mail,
  KeyRound,
  LogOut,
  X,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-vue-next';
import { useAuth } from '../composables/useAuth';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { user, updateProfile, changePassword, logout } = useAuth();

const modalRef = ref<HTMLElement | null>(null);
const headerCloseBtnRef = ref<HTMLButtonElement | null>(null);
let previousActiveElement: HTMLElement | null = null;

const activeTab = ref<'profile' | 'security'>('profile');

// Profile form state
const nameInput = ref(user.value?.name || '');
const emailInput = ref(user.value?.email || '');
const isUpdatingProfile = ref(false);
const profileSuccess = ref('');
const profileError = ref('');

// Password form state
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isChangingPassword = ref(false);
const passwordSuccess = ref('');
const passwordError = ref('');

// Logout state
const isLoggingOut = ref(false);

// Format member registration date
const memberSinceText = computed(() => {
  if (!user.value?.createdAt) return 'Member';
  try {
    const d = new Date(user.value.createdAt);
    if (isNaN(d.getTime())) return 'Member';
    const formatted = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `Member since ${formatted}`;
  } catch {
    return 'Member';
  }
});

// Keep profile inputs in sync with user state
watch(
  user,
  (currentUser) => {
    if (currentUser) {
      nameInput.value = currentUser.name || '';
      emailInput.value = currentUser.email || '';
    }
  },
  { immediate: true }
);

function switchTab(tab: 'profile' | 'security') {
  if (isUpdatingProfile.value || isChangingPassword.value) return;
  activeTab.value = tab;
  profileError.value = '';
  profileSuccess.value = '';
  passwordError.value = '';
  passwordSuccess.value = '';
}

function handleClose() {
  emit('close');
}

async function handleUpdateProfile() {
  if (isUpdatingProfile.value) return;
  profileError.value = '';
  profileSuccess.value = '';

  const cleanName = nameInput.value.trim();
  const cleanEmail = emailInput.value.trim();

  if (!cleanName) {
    profileError.value = 'Please enter your full name.';
    return;
  }
  if (!cleanEmail) {
    profileError.value = 'Please enter your email address.';
    return;
  }

  isUpdatingProfile.value = true;
  try {
    await updateProfile({ name: cleanName, email: cleanEmail });
    profileSuccess.value = 'Profile updated successfully.';
  } catch (err: any) {
    profileError.value = err?.message || err?.statusMessage || 'Failed to update profile. Please try again.';
  } finally {
    isUpdatingProfile.value = false;
  }
}

async function handleChangePassword() {
  if (isChangingPassword.value) return;
  passwordError.value = '';
  passwordSuccess.value = '';

  if (!currentPassword.value) {
    passwordError.value = 'Please enter your current password.';
    return;
  }
  if (!newPassword.value) {
    passwordError.value = 'Please enter a new password.';
    return;
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'New password must be at least 8 characters long.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'New passwords do not match.';
    return;
  }

  isChangingPassword.value = true;
  try {
    await changePassword(currentPassword.value, newPassword.value);
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordSuccess.value = 'Password changed successfully.';
  } catch (err: any) {
    passwordError.value = err?.message || err?.statusMessage || 'Failed to change password. Please try again.';
  } finally {
    isChangingPassword.value = false;
  }
}

async function handleLogout() {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await logout();
    emit('close');
  } catch {
    emit('close');
  } finally {
    isLoggingOut.value = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    handleClose();
    return;
  }

  // Focus trap inside modal
  if (e.key === 'Tab' && modalRef.value) {
    const focusable = modalRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  if (e.key === 'Escape') {
    e.preventDefault();
    handleClose();
  }
}

onMounted(async () => {
  if (typeof document !== 'undefined') {
    previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    await nextTick();
    if (headerCloseBtnRef.value) {
      headerCloseBtnRef.value.focus();
    } else if (modalRef.value) {
      modalRef.value.focus();
    }
  }
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
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  }
});
</script>

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

.profile-modal {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
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

.profile-modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  overflow-y: auto;
  max-height: calc(85vh - 120px);
}

/* User Info Banner */
.profile-user-banner {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1rem;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.user-avatar-badge {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.profile-user-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-user-email {
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-member-since {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.725rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.member-since-icon {
  flex-shrink: 0;
}

/* Tabs */
.profile-tabs {
  display: flex;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.25rem;
  gap: 0.25rem;
}

.profile-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.profile-tab-btn:hover {
  color: var(--text-primary);
}

.profile-tab-btn.active {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}

/* Form Styles */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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

.profile-input {
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
}

/* Alerts */
.profile-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  line-height: 1.4;
}

.profile-alert-success {
  background-color: rgba(135, 169, 135, 0.12);
  border: 1px solid var(--accent-success);
  color: var(--accent-success);
}

.profile-alert-error {
  background-color: rgba(196, 116, 110, 0.12);
  border: 1px solid var(--accent-danger);
  color: var(--accent-danger);
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.alert-text {
  word-break: break-word;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.btn-update-profile,
.btn-change-password {
  padding: 0.45rem 1rem;
  font-size: 0.825rem;
  font-weight: 600;
}

/* Footer Actions */
.profile-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem 1.15rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-app);
}

.btn-signout {
  padding: 0.45rem 0.95rem;
  font-size: 0.825rem;
  font-weight: 500;
}

.btn-danger {
  background-color: var(--accent-danger);
  color: var(--text-inverse);
  border-color: transparent;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--accent-danger-hover);
  transform: translateY(-1px);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
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

@media (max-width: 767px) {
  .dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .profile-modal {
    max-width: 100%;
    max-height: 90vh;
    max-height: 90dvh;
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

  .profile-modal-footer {
    gap: 0.5rem;
    padding: 0.75rem 1rem 1.25rem;
  }

  .btn-signout {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }

  .btn-update-profile,
  .btn-change-password {
    width: 100%;
    min-height: 44px;
    justify-content: center;
  }
}
</style>
