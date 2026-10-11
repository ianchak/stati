/**
 * Documentation bundle - functionality specific to docs pages.
 * Table of contents scroll-spy and sidebar positioning. Sidebar sections are
 * native <details> elements and need no script.
 */

import { initToc, revealCurrentSidebarLink } from './docs/index.js';

document.addEventListener('DOMContentLoaded', () => {
  revealCurrentSidebarLink();
  initToc();
});
