/**
 * Main entry point for Stati documentation site client-side code.
 * All modules are bundled by esbuild and automatically injected into pages.
 */

import { initTheme } from './theme.js';
import { initMobileMenu } from './mobile-menu.js';
import { initSidebar } from './sidebar.js';
import { initTabs } from './tabs.js';
import { initToc } from './toc.js';
import { initScrollToTop } from './scroll-to-top.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initSidebar();
  initTabs();
  initToc();
  initScrollToTop();
});
