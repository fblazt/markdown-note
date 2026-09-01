export type ThemeSetting = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'markdown-note-theme';

// Module-level reactive singleton state
const themeSetting = ref<ThemeSetting>('system');
const resolvedTheme = ref<ResolvedTheme>('dark');
const isInitialized = ref(false);

let mediaQueryList: MediaQueryList | null = null;
let mediaQueryListener: ((e: MediaQueryListEvent | MediaQueryList) => void) | null = null;

/**
 * Detects the current OS preferred color scheme.
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

/**
 * Updates data attributes on document.documentElement for CSS theming.
 */
function updateDomAttributes(theme: ResolvedTheme, setting: ThemeSetting): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme-setting', setting);
}

/**
 * Recalculates resolvedTheme from themeSetting and applies DOM attributes.
 */
function applyTheme(): void {
  if (themeSetting.value === 'system') {
    resolvedTheme.value = getSystemTheme();
  } else {
    resolvedTheme.value = themeSetting.value;
  }
  updateDomAttributes(resolvedTheme.value, themeSetting.value);
}

/**
 * Sets the theme setting ('system' | 'dark' | 'light'), persists to localStorage,
 * and updates document attributes.
 */
function setTheme(setting: ThemeSetting): void {
  themeSetting.value = setting;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, setting);
    } catch {
      // Ignore localStorage write errors (e.g. private mode quota)
    }
  }
  applyTheme();
}

/**
 * Cycles through theme settings: system -> light (Lotus) -> dark (Dragon) -> system.
 */
function toggleTheme(): void {
  if (themeSetting.value === 'system') {
    setTheme('light');
  } else if (themeSetting.value === 'light') {
    setTheme('dark');
  } else {
    setTheme('system');
  }
}

/**
 * Initializes theme on the client side:
 * 1. Reads saved theme from localStorage (defaulting to 'system').
 * 2. Applies data-theme and data-theme-setting to document.documentElement.
 * 3. Registers matchMedia listener to react dynamically to OS color-scheme changes.
 */
function initTheme(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let savedSetting: ThemeSetting = 'system';
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'system' || stored === 'dark' || stored === 'light') {
        savedSetting = stored;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  themeSetting.value = savedSetting;
  applyTheme();

  // Attach matchMedia listener if supported
  if (typeof window.matchMedia === 'function') {
    // Clean up any existing listener
    if (mediaQueryList && mediaQueryListener) {
      if (typeof mediaQueryList.removeEventListener === 'function') {
        mediaQueryList.removeEventListener('change', mediaQueryListener);
      } else if (typeof (mediaQueryList as any).removeListener === 'function') {
        (mediaQueryList as any).removeListener(mediaQueryListener);
      }
    }

    mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = (e: MediaQueryListEvent | MediaQueryList) => {
      if (themeSetting.value === 'system') {
        resolvedTheme.value = e.matches ? 'dark' : 'light';
        updateDomAttributes(resolvedTheme.value, themeSetting.value);
      }
    };

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', mediaQueryListener);
    } else if (typeof (mediaQueryList as any).addListener === 'function') {
      (mediaQueryList as any).addListener(mediaQueryListener);
    }
  }

  isInitialized.value = true;
}

export function useTheme() {
  return {
    themeSetting,
    resolvedTheme,
    isInitialized,
    setTheme,
    toggleTheme,
    initTheme,
  };
}
