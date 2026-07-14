/**
 * Core bundle - shared functionality for all pages.
 * Includes theme toggling and mobile menu.
 */

import {
  initTheme,
  initMobileMenu,
  initSearchUI,
  prefersReducedMotion,
  onReducedMotionChange,
} from './core/index.js';

function applyRootScrollBehavior(isReducedMotion: boolean): void {
  document.documentElement.style.scrollBehavior = isReducedMotion ? 'auto' : 'smooth';
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initSearchUI();
  applyRootScrollBehavior(prefersReducedMotion());

  const cleanupReducedMotionListener = onReducedMotionChange((isReducedMotion) => {
    applyRootScrollBehavior(isReducedMotion);
  });

  window.addEventListener(
    'pagehide',
    () => {
      cleanupReducedMotionListener();
    },
    { once: true },
  );
});
