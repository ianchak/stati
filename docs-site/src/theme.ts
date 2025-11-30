/**
 * Theme toggle functionality for dark/light mode.
 * Handles toggling, localStorage persistence, and system preference detection.
 *
 * Note: The FOUC (Flash of Unstyled Content) prevention script remains inline
 * in header.eta to run synchronously before first paint.
 */

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

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
 */
function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Toggles the current theme and persists the preference.
 */
function toggleTheme(): Theme {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';

  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY, newTheme);

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
    systemMediaQuery.addEventListener('change', (e) => {
      // Only apply system theme if user hasn't set a preference
      if (!getStoredTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Bind click handlers
  themeToggleBtn?.addEventListener('click', toggleTheme);
  themeToggleMobileBtn?.addEventListener('click', toggleTheme);
}
