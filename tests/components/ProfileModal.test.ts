// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import ProfileModal from '../../app/components/ProfileModal.vue';
import { useAuth } from '../../app/composables/useAuth';
import { resetDb } from '../../app/utils/db';
import type { User } from '../../shared/types/auth';

describe('Component: ProfileModal (app/components/ProfileModal.vue)', () => {
  let wrapper: VueWrapper<any>;
  const originalFetch = globalThis.fetch;

  const mockUser: User = {
    id: 'usr_78901',
    name: 'Alice Wonder',
    email: 'alice@example.com',
    createdAt: '2026-01-15T10:00:00.000Z',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDb();

    // Default mock fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    // Set up auth state
    const auth = useAuth();
    auth.user.value = { ...mockUser };
    auth.isAuthenticated.value = true;
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  function createWrapper() {
    return mount(ProfileModal, {
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
  }

  describe('User Info Banner & Account Details Rendering', () => {
    it('renders user name, email, and formatted member since date', () => {
      wrapper = createWrapper();

      const nameEl = wrapper.find('.profile-user-name');
      const emailEl = wrapper.find('.profile-user-email');
      const memberSinceEl = wrapper.find('.profile-member-since');

      expect(nameEl.text()).toBe('Alice Wonder');
      expect(emailEl.text()).toBe('alice@example.com');
      expect(memberSinceEl.text()).toContain('Member since');
      expect(memberSinceEl.text()).toContain('2026');
    });

    it('populates profile input fields with current user information', () => {
      wrapper = createWrapper();

      const nameInput = wrapper.find<HTMLInputElement>('#profile-name');
      const emailInput = wrapper.find<HTMLInputElement>('#profile-email');

      expect(nameInput.element.value).toBe('Alice Wonder');
      expect(emailInput.element.value).toBe('alice@example.com');
    });

    it('updates profile input fields when user state changes reactively', async () => {
      const auth = useAuth();
      wrapper = createWrapper();

      const nameInput = wrapper.find<HTMLInputElement>('#profile-name');
      const emailInput = wrapper.find<HTMLInputElement>('#profile-email');

      expect(nameInput.element.value).toBe('Alice Wonder');
      expect(emailInput.element.value).toBe('alice@example.com');

      auth.user.value = {
        id: 'usr_new_789',
        name: 'Bob Marley',
        email: 'bob@example.com',
        createdAt: '2026-02-01T00:00:00.000Z',
      };
      await flushPromises();

      expect(nameInput.element.value).toBe('Bob Marley');
      expect(emailInput.element.value).toBe('bob@example.com');
    });

    it('falls back gracefully when user createdAt is missing or invalid', () => {
      const auth = useAuth();
      auth.user.value = {
        id: 'usr_empty',
        name: 'Guest User',
        email: 'guest@example.com',
        createdAt: '',
      };

      wrapper = createWrapper();
      const memberSinceEl = wrapper.find('.profile-member-since');
      expect(memberSinceEl.text()).toBe('Member');
    });

    it('switches tabs between profile details and security sections', async () => {
      wrapper = createWrapper();

      const profileTabBtn = wrapper.find('[data-tab="profile"]');
      const securityTabBtn = wrapper.find('[data-tab="security"]');

      expect(profileTabBtn.classes()).toContain('active');
      expect(securityTabBtn.classes()).not.toContain('active');

      await securityTabBtn.trigger('click');

      expect(profileTabBtn.classes()).not.toContain('active');
      expect(securityTabBtn.classes()).toContain('active');
      expect(wrapper.find('.password-form').isVisible()).toBe(true);
    });

    it('emits close event when close button in header is clicked', async () => {
      wrapper = createWrapper();

      const closeHeaderBtn = wrapper.find('.dialog-btn-close');
      await closeHeaderBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')?.length).toBe(1);
    });

    it('emits close event on Escape keydown', async () => {
      wrapper = createWrapper();

      const modalEl = wrapper.find('.profile-modal');
      await modalEl.trigger('keydown', { key: 'Escape' });

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close event when clicking on the backdrop overlay', async () => {
      wrapper = createWrapper();

      const overlay = wrapper.find('.dialog-overlay');
      await overlay.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Profile Details Form Submission', () => {
    it('successfully updates profile when server returns standard Go response envelope', async () => {
      const updatedUser: User = {
        ...mockUser,
        name: 'Envelope Name',
        email: 'envelope@example.com',
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

      wrapper = createWrapper();

      const nameInput = wrapper.find('#profile-name');
      const emailInput = wrapper.find('#profile-email');

      await nameInput.setValue('Envelope Name');
      await emailInput.setValue('envelope@example.com');

      const form = wrapper.find('.profile-form');
      await form.trigger('submit');
      await flushPromises();

      const successAlert = wrapper.find('.profile-alert-success');
      expect(successAlert.exists()).toBe(true);
      expect(successAlert.text()).toContain('Profile updated successfully.');

      const auth = useAuth();
      expect(auth.user.value?.name).toBe('Envelope Name');
      expect(auth.user.value?.email).toBe('envelope@example.com');
    });

    it('successfully calls updateProfile API and shows success message', async () => {
      const updatedUser: User = {
        ...mockUser,
        name: 'Alice Smith',
        email: 'alicesmith@example.com',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: updatedUser }),
      });

      wrapper = createWrapper();

      const nameInput = wrapper.find('#profile-name');
      const emailInput = wrapper.find('#profile-email');

      await nameInput.setValue('Alice Smith');
      await emailInput.setValue('alicesmith@example.com');

      const form = wrapper.find('.profile-form');
      await form.trigger('submit');
      await flushPromises();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/profile',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Alice Smith',
            email: 'alicesmith@example.com',
          }),
        })
      );

      const successAlert = wrapper.find('.profile-alert-success');
      expect(successAlert.exists()).toBe(true);
      expect(successAlert.text()).toContain('Profile updated successfully.');

      const auth = useAuth();
      expect(auth.user.value?.name).toBe('Alice Smith');
      expect(auth.user.value?.email).toBe('alicesmith@example.com');
    });

    it('validates empty name input and prevents submission', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      wrapper = createWrapper();

      const nameInput = wrapper.find('#profile-name');
      await nameInput.setValue('   ');

      const form = wrapper.find('.profile-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.profile-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Please enter your full name.');
    });

    it('validates empty email input and prevents submission', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      wrapper = createWrapper();

      const emailInput = wrapper.find('#profile-email');
      await emailInput.setValue('');

      const form = wrapper.find('.profile-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.profile-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Please enter your email address.');
    });

    it('displays error alert when updateProfile throws an error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ statusCode: 409, message: 'Email already in use' }),
      });

      wrapper = createWrapper();

      const form = wrapper.find('.profile-form');
      await form.trigger('submit');
      await flushPromises();

      const errorAlert = wrapper.find('.profile-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Email already in use');
    });
  });

  describe('Security / Change Password Form & Validation', () => {
    beforeEach(async () => {
      wrapper = createWrapper();
      const securityTabBtn = wrapper.find('[data-tab="security"]');
      await securityTabBtn.trigger('click');
    });

    it('validates missing current password', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const newPassInput = wrapper.find('#new-password');
      const confirmPassInput = wrapper.find('#confirm-password');

      await newPassInput.setValue('newPassword123');
      await confirmPassInput.setValue('newPassword123');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.password-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Please enter your current password.');
    });

    it('validates missing new password', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const currentPassInput = wrapper.find('#current-password');
      await currentPassInput.setValue('oldPassword123');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.password-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Please enter a new password.');
    });

    it('validates new password length less than 8 characters', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const currentPassInput = wrapper.find('#current-password');
      const newPassInput = wrapper.find('#new-password');
      const confirmPassInput = wrapper.find('#confirm-password');

      await currentPassInput.setValue('oldPassword123');
      await newPassInput.setValue('short');
      await confirmPassInput.setValue('short');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.password-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('New password must be at least 8 characters long.');
    });

    it('validates mismatch between new password and confirm password', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const currentPassInput = wrapper.find('#current-password');
      const newPassInput = wrapper.find('#new-password');
      const confirmPassInput = wrapper.find('#confirm-password');

      await currentPassInput.setValue('oldPassword123');
      await newPassInput.setValue('securePasswordA1');
      await confirmPassInput.setValue('mismatchPasswordB2');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      expect(fetchSpy).not.toHaveBeenCalled();
      const errorAlert = wrapper.find('.password-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('New passwords do not match.');
    });

    it('successfully calls changePassword and clears input fields on valid submission', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const currentPassInput = wrapper.find<HTMLInputElement>('#current-password');
      const newPassInput = wrapper.find<HTMLInputElement>('#new-password');
      const confirmPassInput = wrapper.find<HTMLInputElement>('#confirm-password');

      await currentPassInput.setValue('oldPassword123');
      await newPassInput.setValue('newValidPassword88');
      await confirmPassInput.setValue('newValidPassword88');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            currentPassword: 'oldPassword123',
            newPassword: 'newValidPassword88',
          }),
        })
      );

      const successAlert = wrapper.find('.password-alert-success');
      expect(successAlert.exists()).toBe(true);
      expect(successAlert.text()).toContain('Password changed successfully.');

      // Fields should be cleared
      expect(currentPassInput.element.value).toBe('');
      expect(newPassInput.element.value).toBe('');
      expect(confirmPassInput.element.value).toBe('');
    });

    it('displays error alert when changePassword throws an error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ statusCode: 400, message: 'Incorrect current password' }),
      });

      const currentPassInput = wrapper.find('#current-password');
      const newPassInput = wrapper.find('#new-password');
      const confirmPassInput = wrapper.find('#confirm-password');

      await currentPassInput.setValue('wrongOldPass');
      await newPassInput.setValue('newValidPassword88');
      await confirmPassInput.setValue('newValidPassword88');

      const form = wrapper.find('.password-form');
      await form.trigger('submit');
      await flushPromises();

      const errorAlert = wrapper.find('.password-alert-error');
      expect(errorAlert.exists()).toBe(true);
      expect(errorAlert.text()).toContain('Incorrect current password');
    });
  });

  describe('Sign Out Action', () => {
    it('calls logout and emits close event when Sign Out button is clicked', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      wrapper = createWrapper();

      const signoutBtn = wrapper.find('.btn-signout');
      expect(signoutBtn.exists()).toBe(true);

      await signoutBtn.trigger('click');
      await flushPromises();
      await new Promise((r) => setTimeout(r, 20));
      await flushPromises();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({ method: 'POST' })
      );

      const auth = useAuth();
      expect(auth.user.value).toBeNull();
      expect(auth.isAuthenticated.value).toBe(false);

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close event and purges local data even if logout API throws an error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Server unavailable'));

      wrapper = createWrapper();

      const signoutBtn = wrapper.find('.btn-signout');
      await signoutBtn.trigger('click');
      await flushPromises();
      await new Promise((r) => setTimeout(r, 20));
      await flushPromises();

      const auth = useAuth();
      expect(auth.user.value).toBeNull();
      expect(auth.isAuthenticated.value).toBe(false);

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});
