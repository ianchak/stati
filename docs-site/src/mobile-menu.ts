/**
 * Mobile menu functionality for header navigation.
 * Handles opening/closing the mobile navigation menu.
 */

interface MobileMenuElements {
  menuBtn: HTMLElement | null;
  mobileNav: HTMLElement | null;
}

/**
 * Gets the mobile menu DOM elements.
 */
function getElements(): MobileMenuElements {
  return {
    menuBtn: document.getElementById('mobile-menu-btn'),
    mobileNav: document.getElementById('mobile-nav'),
  };
}

/**
 * Closes the mobile menu.
 */
function closeMenu(elements: MobileMenuElements): void {
  elements.mobileNav?.classList.add('hidden');
}

/**
 * Initializes the mobile menu functionality.
 * Sets up toggle behavior, outside click handling, and resize handling.
 */
export function initMobileMenu(): void {
  const elements = getElements();
  const { menuBtn, mobileNav } = elements;

  if (!menuBtn || !mobileNav) return;

  // Toggle menu on button click
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileNav.classList.toggle('hidden');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileNav.contains(e.target as Node) && !menuBtn.contains(e.target as Node)) {
      closeMenu(elements);
    }
  });

  // Close on desktop resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      closeMenu(elements);
    }
  });
}
