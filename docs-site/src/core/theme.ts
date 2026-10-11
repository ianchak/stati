/**
 * Theme toggle for dark/light mode.
 *
 * The no-flash bootstrap runs inline in themeInit.eta before first paint.
 * This module wires the toggle button (aria-pressed = dark theme on),
 * persists explicit choices, and follows the system setting otherwise.
 *
 * Storage key: 'stati-theme' (values: 'light' | 'dark')
 * DOM: sets both the data-theme attribute and the 'dark' class on <html>
 */

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'stati-theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode); the choice lasts for this page only
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  document
    .querySelectorAll<HTMLElement>('#theme-toggle')
    .forEach((button) => button.setAttribute('aria-pressed', String(theme === 'dark')));
}

export function initTheme(): void {
  const system = window.matchMedia(SYSTEM_QUERY);
  applyTheme(readStoredTheme() ?? (system.matches ? 'dark' : 'light'));

  system.addEventListener('change', (event) => {
    if (!readStoredTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next: Theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    storeTheme(next);
  });
}
