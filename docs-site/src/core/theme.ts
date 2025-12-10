/**
 * Theme toggle functionality for dark/light mode.
 * Handles toggling, localStorage persistence, and system preference detection.
 *
 * Note: The FOUC prevention script remains inline in themeInit.eta and runs
 * synchronously before first paint. This module handles the toggle button
 * and system preference changes after the page has loaded.
 *
 * Storage key: 'stati-theme' (values: 'light' | 'dark')
 * DOM: Sets both data-theme attribute and 'dark' class on <html>
 */

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'stati-theme';

/** Stored reference to the system theme change handler for cleanup */
let systemThemeHandler: ((e: { matches: boolean }) => void) | null = null;

/**
 * Removes the system theme change listener if it exists.
 */
function removeSystemThemeListener(): void {
  if (systemThemeHandler) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .removeEventListener('change', systemThemeHandler);
    systemThemeHandler = null;
  }
}

/**
 * Gets the system's preferred color scheme.
 */
function getSystemPreference(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Gets the stored theme preference from localStorage.
 */
function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/**
 * Applies the specified theme to the document.
 * Sets both data-theme attribute (for CSS) and dark class (for Tailwind).
 */
function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Toggles the current theme and persists the preference.
 * Also removes the system theme listener since user now has an explicit preference.
 */
function toggleTheme(): Theme {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';

  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY, newTheme);

  // Remove system theme listener since user has set a preference
  removeSystemThemeListener();

  return newTheme;
}

/**
 * Initializes the theme toggle functionality.
 * Sets up click handlers for both desktop and mobile toggle buttons,
 * and listens for system preference changes.
 */
export function initTheme(): void {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeToggleMobileBtn = document.getElementById('theme-toggle-mobile');

  // Check for saved theme preference or default to system preference
  const savedTheme = getStoredTheme();

  if (savedTheme) {
    // User has a saved preference
    applyTheme(savedTheme);
  } else {
    // No saved preference - use system preference
    applyTheme(getSystemPreference());

    // Listen for system theme changes when no preference is saved
    const systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeHandler = (e: { matches: boolean }) => {
      // Only apply system theme if user hasn't set a preference
      if (!getStoredTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };
    systemMediaQuery.addEventListener('change', systemThemeHandler);
  }

  // Bind click handlers
  themeToggleBtn?.addEventListener('click', toggleTheme);
  themeToggleMobileBtn?.addEventListener('click', toggleTheme);
}
