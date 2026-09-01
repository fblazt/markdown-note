import { apiFetch } from '../utils/api';
import { db } from '../utils/db';
import type {
  User,
  LoginDTO,
  RegisterDTO,
  ChangePasswordDTO,
  UpdateProfileDTO,
  AuthResponse,
} from '../../shared/types/auth';

const user = ref<User | null>(null);
const isAuthenticated = ref(false);
const isOfflineAuthed = ref(false);
const registrationAllowed = ref(true);
const isInitializing = ref(true);

export function useAuth() {
  // Check auth session at startup
  async function initAuth(): Promise<void> {
    isInitializing.value = true;
    try {
      const data = await apiFetch<AuthResponse>('/api/v1/auth/me');
      user.value = data.user;
      isAuthenticated.value = true;
      isOfflineAuthed.value = false;
      if (data.registrationAllowed !== undefined) {
        registrationAllowed.value = data.registrationAllowed;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('last_auth_user', JSON.stringify(data.user));
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline resilience: allow cached session
        const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('last_auth_user') : null;
        if (cached) {
          try {
            user.value = JSON.parse(cached);
            isAuthenticated.value = true;
            isOfflineAuthed.value = true;
          } catch {
            user.value = null;
            isAuthenticated.value = false;
            isOfflineAuthed.value = false;
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('last_auth_user');
            }
          }
        } else {
          user.value = null;
          isAuthenticated.value = false;
          isOfflineAuthed.value = false;
        }
      } else {
        user.value = null;
        isAuthenticated.value = false;
        isOfflineAuthed.value = false;
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('last_auth_user');
        }
      }
    } finally {
      isInitializing.value = false;
    }
  }

  // Register
  async function register(email: string, name: string, password: string): Promise<User> {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password } as RegisterDTO),
    });
    user.value = data.user;
    isAuthenticated.value = true;
    isOfflineAuthed.value = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_auth_user', JSON.stringify(data.user));
    }
    return data.user;
  }

  // Login
  async function login(email: string, password: string): Promise<User> {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password } as LoginDTO),
    });
    user.value = data.user;
    isAuthenticated.value = true;
    isOfflineAuthed.value = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_auth_user', JSON.stringify(data.user));
    }
    return data.user;
  }

  // Logout (Total local purge)
  async function logout(): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await apiFetch('/api/v1/auth/logout', { method: 'POST' });
      }
    } catch {
      // Best-effort server notification
    } finally {
      user.value = null;
      isAuthenticated.value = false;
      isOfflineAuthed.value = false;
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      await db.clearAllUserData();
    }
  }

  // Change Password
  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword } as ChangePasswordDTO),
    });
  }

  // Update Profile (Name & Email)
  async function updateProfile(payload: UpdateProfileDTO): Promise<User> {
    const data = await apiFetch<{ user: User }>('/api/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    user.value = data.user;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('last_auth_user', JSON.stringify(data.user));
    }
    return data.user;
  }

  return {
    user,
    isAuthenticated,
    isOfflineAuthed,
    registrationAllowed,
    isInitializing,
    initAuth,
    login,
    register,
    logout,
    changePassword,
    updateProfile,
  };
}
