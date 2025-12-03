/**
 * Documentation bundle - functionality specific to docs pages.
 * Includes sidebar navigation, table of contents, and scroll-to-top.
 */

import { initSidebar, initToc, initScrollToTop } from './docs/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initToc();
  initScrollToTop();
});
