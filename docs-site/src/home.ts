/**
 * Homepage bundle - functionality specific to the homepage.
 * Includes tabs for the highlights/features section and particles animation.
 */

import { initTabs, initParticles } from './home/index.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initParticles();
});
