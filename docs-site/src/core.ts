/**
 * Core bundle - shared functionality for all pages.
 * Includes theme toggling and mobile menu.
 */

import { initTheme, initMobileMenu } from './core/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
});
