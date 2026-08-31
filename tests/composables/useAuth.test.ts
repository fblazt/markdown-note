import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuth } from '../../app/composables/useAuth';
import { db, resetDb } from '../../app/utils/db';
import type { User, AuthResponse } from '../../shared/types/auth';

describe('Composable: useAuth (app/composables/useAuth.ts)', () => {
  const originalFetch = globalThis.fetch;
  let localStorageStore: Record<string, string> = {};

  const mockUser: User = {
    id: 'usr_12345',
    email: 'test@example.com',
    name: 'Test Developer',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorageStore = {};

    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = String(value);
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Mock navigator.onLine as online by default
    vi.stubGlobal('navigator', {
      onLine: true,
    });

    // Reset database
    await resetDb();

    // Reset composable state
    const auth = useAuth();
    auth.user.value = null;
    auth.isAuthenticated.value = false;
    auth.isOfflineAuthed.value = false;
    auth.registrationAllowed.value = true;
    auth.isInitializing.value = true;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  describe('initAuth', () => {
    it('successfully restores session when server responds with standard envelope { statusCode, statusMessage, data }', async () => {
      const authResponse: AuthResponse = {
        user: mockUser,
        registrationAllowed: true,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          statusCode: 200,
          statusMessage: 'OK',
          data: authResponse,
        }),
      });

      const { user, isAuthenticated, isOfflineAuthed, registrationAllowed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toEqual(mockUser);
      expect(isAuthenticated.value).toBe(true);
      expect(isOfflineAuthed.value).toBe(false);
      expect(registrationAllowed.value).toBe(true);
      expect(isInitializing.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(mockUser));
    });

    it('successfully restores session on active 200 OK server response', async () => {
      const authResponse: AuthResponse = {
        user: mockUser,
        registrationAllowed: true,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => authResponse,
      });

      const { user, isAuthenticated, isOfflineAuthed, registrationAllowed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toEqual(mockUser);
      expect(isAuthenticated.value).toBe(true);
      expect(isOfflineAuthed.value).toBe(false);
      expect(registrationAllowed.value).toBe(true);
      expect(isInitializing.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(mockUser));
    });

    it('updates registrationAllowed when server returns false', async () => {
      const authResponse: AuthResponse = {
        user: mockUser,
        registrationAllowed: false,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => authResponse,
      });

      const { registrationAllowed, initAuth } = useAuth();

      await initAuth();

      expect(registrationAllowed.value).toBe(false);
    });

    it('resets state and removes cached user on 401 Unauthorized while online', async () => {
      localStorageStore['last_auth_user'] = JSON.stringify(mockUser);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      });

      const { user, isAuthenticated, isOfflineAuthed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(isOfflineAuthed.value).toBe(false);
      expect(isInitializing.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBeUndefined();
    });

    it('restores cached session when offline and valid user exists in localStorage', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      localStorageStore['last_auth_user'] = JSON.stringify(mockUser);

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { user, isAuthenticated, isOfflineAuthed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toEqual(mockUser);
      expect(isAuthenticated.value).toBe(true);
      expect(isOfflineAuthed.value).toBe(true);
      expect(isInitializing.value).toBe(false);
    });

    it('clears state when offline and no cached user is in localStorage', async () => {
      vi.stubGlobal('navigator', { onLine: false });

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { user, isAuthenticated, isOfflineAuthed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(isOfflineAuthed.value).toBe(false);
      expect(isInitializing.value).toBe(false);
    });

    it('safely handles corrupted JSON in localStorage when offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      localStorageStore['last_auth_user'] = '{ corrupted invalid json';

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { user, isAuthenticated, isOfflineAuthed, isInitializing, initAuth } = useAuth();

      await initAuth();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(isOfflineAuthed.value).toBe(false);
      expect(isInitializing.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBeUndefined();
    });
  });

  describe('login', () => {
    it('authenticates user when response is wrapped in standard Go envelope', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          statusCode: 200,
          statusMessage: 'OK',
          data: { user: mockUser },
        }),
      });

      const { user, isAuthenticated, login } = useAuth();
      const result = await login('test@example.com', 'secretPass123');

      expect(result).toEqual(mockUser);
      expect(user.value).toEqual(mockUser);
      expect(isAuthenticated.value).toBe(true);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(mockUser));
    });

    it('authenticates user and caches to localStorage on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: mockUser }),
      });

      const { user, isAuthenticated, isOfflineAuthed, login } = useAuth();

      const result = await login('test@example.com', 'secretPass123');

      expect(result).toEqual(mockUser);
      expect(user.value).toEqual(mockUser);
      expect(isAuthenticated.value).toBe(true);
      expect(isOfflineAuthed.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(mockUser));

      // Verify request payload
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'secretPass123' }),
        })
      );
    });

    it('throws error and preserves unauthenticated state on failed credentials', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ statusCode: 401, message: 'Invalid credentials' }),
      });

      const { user, isAuthenticated, login } = useAuth();

      await expect(login('wrong@example.com', 'badpass')).rejects.toThrow('Invalid credentials');
      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
    });
  });

  describe('register', () => {
    it('registers user when response is wrapped in standard Go envelope', async () => {
      const newUser: User = {
        id: 'usr_envelope_1',
        email: 'env@example.com',
        name: 'Envelope User',
        createdAt: '2026-03-01T00:00:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          statusCode: 201,
          statusMessage: 'Created',
          data: { user: newUser },
        }),
      });

      const { user, isAuthenticated, register } = useAuth();
      const result = await register('env@example.com', 'Envelope User', 'pass123456');

      expect(result).toEqual(newUser);
      expect(user.value).toEqual(newUser);
      expect(isAuthenticated.value).toBe(true);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(newUser));
    });

    it('registers user and establishes authenticated session on success', async () => {
      const newUser: User = {
        id: 'usr_new_999',
        email: 'jane@example.com',
        name: 'Jane Developer',
        createdAt: '2026-02-01T00:00:00.000Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: newUser }),
      });

      const { user, isAuthenticated, isOfflineAuthed, register } = useAuth();

      const result = await register('jane@example.com', 'Jane Developer', 'newSecurePass88');

      expect(result).toEqual(newUser);
      expect(user.value).toEqual(newUser);
      expect(isAuthenticated.value).toBe(true);
      expect(isOfflineAuthed.value).toBe(false);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(newUser));

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'jane@example.com',
            name: 'Jane Developer',
            password: 'newSecurePass88',
          }),
        })
      );
    });

    it('throws error on registration conflict / bad request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ statusCode: 409, message: 'Email is already registered' }),
      });

      const { user, isAuthenticated, register } = useAuth();

      await expect(register('taken@example.com', 'Taken', 'pass123456')).rejects.toThrow('Email is already registered');
      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
    });
  });

  describe('logout & local purge', () => {
    it('calls logout API, resets auth state, clears localStorage, and purges database tables', async () => {
      // Seed some data in db first
      await db.notes.add({
        id: 'test-note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        syncStatus: 'synced',
      });
      await db.folders.add({
        name: 'Test Folder',
        deletedAt: null,
        syncStatus: 'synced',
      });
      expect(await db.notes.count()).toBeGreaterThan(0);
      expect(await db.folders.count()).toBeGreaterThan(0);

      localStorageStore['last_auth_user'] = JSON.stringify(mockUser);
      localStorageStore['markdown_theme'] = 'dark';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const { user, isAuthenticated, isOfflineAuthed, logout } = useAuth();
      user.value = mockUser;
      isAuthenticated.value = true;

      await logout();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(isOfflineAuthed.value).toBe(false);
      expect(Object.keys(localStorageStore).length).toBe(0);

      // Verify db wipe
      expect(await db.notes.count()).toBe(0);
      expect(await db.folders.count()).toBe(0);
      expect(await db.mutationQueue.count()).toBe(0);
      expect(await db.syncMeta.count()).toBe(0);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('still completes local purge even if server logout request fails', async () => {
      await db.notes.add({
        id: 'test-note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        syncStatus: 'synced',
      });
      expect(await db.notes.count()).toBeGreaterThan(0);
      localStorageStore['last_auth_user'] = JSON.stringify(mockUser);

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Server offline'));

      const { user, isAuthenticated, logout } = useAuth();
      user.value = mockUser;
      isAuthenticated.value = true;

      await logout();

      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(Object.keys(localStorageStore).length).toBe(0);
      expect(await db.notes.count()).toBe(0);
    });

    it('skips server call and executes local purge when offline', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      globalThis.fetch = vi.fn();

      const { user, isAuthenticated, logout } = useAuth();
      user.value = mockUser;
      isAuthenticated.value = true;

      await logout();

      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(user.value).toBeNull();
      expect(isAuthenticated.value).toBe(false);
      expect(await db.notes.count()).toBe(0);
    });
  });

  describe('changePassword', () => {
    it('submits change password request with current and new password', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const { changePassword } = useAuth();

      await changePassword('oldPassword123', 'newPassword456');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword456',
          }),
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('updates user profile data when response is wrapped in standard Go envelope', async () => {
      const updatedUser: User = {
        ...mockUser,
        name: 'Envelope Updated Name',
        email: 'env_updated@example.com',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          statusCode: 200,
          statusMessage: 'OK',
          data: { user: updatedUser },
        }),
      });

      const { user, updateProfile } = useAuth();
      user.value = mockUser;

      const result = await updateProfile({ name: 'Envelope Updated Name', email: 'env_updated@example.com' });

      expect(result).toEqual(updatedUser);
      expect(user.value).toEqual(updatedUser);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(updatedUser));
    });

    it('updates user profile data and syncs localStorage cache', async () => {
      const updatedUser: User = {
        ...mockUser,
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: updatedUser }),
      });

      const { user, updateProfile } = useAuth();
      user.value = mockUser;

      const result = await updateProfile({ name: 'Updated Name', email: 'updated@example.com' });

      expect(result).toEqual(updatedUser);
      expect(user.value).toEqual(updatedUser);
      expect(localStorageStore['last_auth_user']).toBe(JSON.stringify(updatedUser));

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/profile',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name', email: 'updated@example.com' }),
        })
      );
    });
  });
});
