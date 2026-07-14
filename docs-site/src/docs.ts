/**
 * Documentation bundle - functionality specific to docs pages.
 * Includes sidebar navigation, table of contents, scroll-to-top, and search.
 */

import { onIdle } from './core/index.js';
import { initSidebar, initToc, initScrollToTop, initReadingProgress } from './docs/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initToc();
  onIdle(() => {
    initScrollToTop();
  });
  onIdle(() => {
    initReadingProgress();
  });
});
