/**
 * Core bundle - shared functionality for all pages.
 * Theme toggle, mobile menu, copy buttons, and the search dialog.
 */

import { initTheme, initMobileMenu, initCopy, initSearchDialog } from './core/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initCopy();
  initSearchDialog();
});
