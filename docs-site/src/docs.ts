/**
 * Documentation bundle - functionality specific to docs pages.
 * Includes sidebar navigation, table of contents, scroll-to-top, and search.
 */

import { initSidebar, initToc, initScrollToTop, initSearchUI } from './docs/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initToc();
  initScrollToTop();
  initSearchUI();
});
