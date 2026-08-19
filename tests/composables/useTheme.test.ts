import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme, THEME_STORAGE_KEY } from '../../app/composables/useTheme';

describe('Composable: useTheme', () => {
  let localStorageStore: Record<string, string> = {};
  let matchMediaListeners: Array<(e: any) => void> = [];
  let currentSystemDark = true;

  beforeEach(() => {
    localStorageStore = {};
    matchMediaListeners = [];
    currentSystemDark = true;

    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageStore[key];
      }),
      clear: vi.fn(() => {
        localStorageStore = {};
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Mock document.documentElement attributes
    const docAttributes: Record<string, string> = {};
    const mockDocument = {
      documentElement: {
        setAttribute: vi.fn((key: string, val: string) => {
          docAttributes[key] = val;
        }),
        getAttribute: vi.fn((key: string) => docAttributes[key] ?? null),
      },
    };
    vi.stubGlobal('document', mockDocument);

    // Mock window.matchMedia
    const mockMatchMedia = vi.fn((query: string) => {
      return {
        matches: currentSystemDark,
        media: query,
        onchange: null,
        addListener: vi.fn((fn: any) => matchMediaListeners.push(fn)),
        removeListener: vi.fn((fn: any) => {
          matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
        }),
        addEventListener: vi.fn((event: string, fn: any) => {
          if (event === 'change') matchMediaListeners.push(fn);
        }),
        removeEventListener: vi.fn((event: string, fn: any) => {
          if (event === 'change') {
            matchMediaListeners = matchMediaListeners.filter((l) => l !== fn);
          }
        }),
        dispatchEvent: vi.fn(),
      };
    });
    vi.stubGlobal('window', { matchMedia: mockMatchMedia });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('initializes with default system theme when no stored setting exists', () => {
    currentSystemDark = true;
    const { themeSetting, resolvedTheme, initTheme } = useTheme();

    initTheme();

    expect(themeSetting.value).toBe('system');
    expect(resolvedTheme.value).toBe('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme-setting', 'system');
  });

  it('resolves system theme to light when OS prefers light mode', () => {
    currentSystemDark = false;
    const { themeSetting, resolvedTheme, initTheme } = useTheme();

    initTheme();

    expect(themeSetting.value).toBe('system');
    expect(resolvedTheme.value).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme-setting', 'system');
  });

  it('switches to light (Lotus) theme and persists to localStorage', () => {
    const { themeSetting, resolvedTheme, setTheme } = useTheme();

    setTheme('light');

    expect(themeSetting.value).toBe('light');
    expect(resolvedTheme.value).toBe('light');
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme-setting', 'light');
  });

  it('switches to dark (Dragon) theme and persists to localStorage', () => {
    const { themeSetting, resolvedTheme, setTheme } = useTheme();

    setTheme('dark');

    expect(themeSetting.value).toBe('dark');
    expect(resolvedTheme.value).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme-setting', 'dark');
  });

  it('cycles theme through toggleTheme(): system -> light -> dark -> system', () => {
    const { themeSetting, setTheme, toggleTheme } = useTheme();

    setTheme('system');
    expect(themeSetting.value).toBe('system');

    toggleTheme();
    expect(themeSetting.value).toBe('light');

    toggleTheme();
    expect(themeSetting.value).toBe('dark');

    toggleTheme();
    expect(themeSetting.value).toBe('system');
  });

  it('restores saved theme setting from localStorage upon initTheme()', () => {
    localStorageStore[THEME_STORAGE_KEY] = 'light';
    const { themeSetting, resolvedTheme, initTheme } = useTheme();

    initTheme();

    expect(themeSetting.value).toBe('light');
    expect(resolvedTheme.value).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme-setting', 'light');
  });

  it('handles invalid / corrupted localStorage values by falling back to system', () => {
    localStorageStore[THEME_STORAGE_KEY] = 'invalid-theme-value';
    currentSystemDark = true;
    const { themeSetting, resolvedTheme, initTheme } = useTheme();

    initTheme();

    expect(themeSetting.value).toBe('system');
    expect(resolvedTheme.value).toBe('dark');
  });

  it('updates resolvedTheme dynamically when OS color-scheme changes in system mode', () => {
    currentSystemDark = true;
    const { themeSetting, resolvedTheme, initTheme } = useTheme();

    initTheme();
    expect(themeSetting.value).toBe('system');
    expect(resolvedTheme.value).toBe('dark');

    // Simulate OS color-scheme change to light
    expect(matchMediaListeners.length).toBeGreaterThan(0);
    for (const listener of matchMediaListeners) {
      listener({ matches: false } as any);
    }

    expect(resolvedTheme.value).toBe('light');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');

    // Simulate OS color-scheme change back to dark
    for (const listener of matchMediaListeners) {
      listener({ matches: true } as any);
    }

    expect(resolvedTheme.value).toBe('dark');
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });

  it('ignores OS color-scheme changes when explicit dark or light theme is set', () => {
    const { resolvedTheme, setTheme, initTheme } = useTheme();

    initTheme();
    setTheme('light');
    expect(resolvedTheme.value).toBe('light');

    // Simulate OS event claiming OS is dark
    for (const listener of matchMediaListeners) {
      listener({ matches: true } as any);
    }

    // Should remain light because themeSetting is explicitly 'light'
    expect(resolvedTheme.value).toBe('light');
  });
});
