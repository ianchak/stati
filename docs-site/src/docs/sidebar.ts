/**
 * Sidebar functionality.
 * Handles section toggles, scroll position persistence, active page highlighting,
 * and mobile sidebar behavior.
 */

const STORAGE_KEY = 'sidebarState';
const SCROLL_POSITION_KEY = 'sidebarScrollPosition';

interface SidebarElements {
  sidebar: HTMLElement | null;
  overlay: HTMLElement | null;
  toggleBtn: HTMLElement | null;
  mobileMenuButton: HTMLElement | null;
}

interface SectionState {
  [sectionName: string]: boolean;
}

/**
 * Gets the sidebar DOM elements.
 */
function getElements(): SidebarElements {
  return {
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('sidebar-overlay'),
    toggleBtn: document.getElementById('sidebar-toggle-btn'),
    mobileMenuButton: document.querySelector('[data-mobile-menu]'),
  };
}

/**
 * Normalizes a path for comparison (handles trailing slashes and index.html).
 */
function normalizePath(path: string): string {
  // Remove index.html if present
  let normalized = path.replace(/\/index\.html$/, '/');
  // Ensure trailing slash for directories
  if (!normalized.endsWith('/') && !normalized.includes('.')) {
    normalized += '/';
  }
  return normalized;
}

/**
 * Toggles the mobile sidebar visibility.
 */
function toggleMobileSidebar(elements: SidebarElements, forceClose = false): void {
  const { sidebar, overlay, toggleBtn } = elements;
  if (!sidebar || !overlay) return;

  const isHidden = sidebar.classList.contains('-translate-x-full');

  if (forceClose || !isHidden) {
    // Close sidebar
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0', 'pointer-events-none');
    toggleBtn?.classList.remove('opacity-0', 'pointer-events-none');
  } else {
    // Open sidebar
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    toggleBtn?.classList.add('opacity-0', 'pointer-events-none');
  }
}

/**
 * Initializes section toggles with localStorage persistence.
 */
function initSectionToggles(): SectionState {
  const state: SectionState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  document.querySelectorAll<HTMLElement>('.section-toggle').forEach((toggle) => {
    const sectionName = toggle.getAttribute('data-section');
    if (!sectionName) return;

    const content = toggle.nextElementSibling as HTMLElement | null;
    const isExpanded = state[sectionName] !== false; // Default to expanded

    // Set initial state
    if (content) {
      if (isExpanded) {
        toggle.setAttribute('data-expanded', 'true');
        content.style.maxHeight = `${content.scrollHeight}px`;
        content.style.overflow = 'visible';
      } else {
        toggle.removeAttribute('data-expanded');
        content.style.maxHeight = '0px';
        content.style.overflow = 'hidden';
      }
    }

    // Handle toggle clicks
    toggle.addEventListener('click', () => {
      const isCurrentlyExpanded = toggle.getAttribute('data-expanded') === 'true';

      if (isCurrentlyExpanded) {
        toggle.removeAttribute('data-expanded');
        if (content) {
          content.style.maxHeight = '0px';
          content.style.overflow = 'hidden';
        }
        state[sectionName] = false;
      } else {
        toggle.setAttribute('data-expanded', 'true');
        if (content) {
          content.style.maxHeight = `${content.scrollHeight}px`;
          content.style.overflow = 'visible';
        }
        state[sectionName] = true;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  });

  return state;
}

/**
 * Restores the saved scroll position.
 */
function restoreScrollPosition(sidebar: HTMLElement | null): void {
  const savedScrollPosition = localStorage.getItem(SCROLL_POSITION_KEY);
  if (savedScrollPosition && sidebar) {
    sidebar.scrollTop = parseInt(savedScrollPosition, 10);
  }
}

/**
 * Sets up scroll position persistence with debouncing.
 */
function setupScrollPersistence(sidebar: HTMLElement): void {
  let scrollTimeout: number;

  sidebar.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      localStorage.setItem(SCROLL_POSITION_KEY, sidebar.scrollTop.toString());
    }, 100);
  });
}

/**
 * Highlights the active page in the sidebar and expands its section.
 */
function highlightActivePage(state: SectionState): void {
  const currentPath = window.location.pathname;
  const normalizedCurrentPath = normalizePath(currentPath);

  document.querySelectorAll<HTMLAnchorElement>('.sidebar-link').forEach((link) => {
    const linkHref = link.getAttribute('href');
    if (!linkHref) return;

    const normalizedLinkHref = normalizePath(linkHref);

    if (normalizedLinkHref === normalizedCurrentPath) {
      // Add the active class
      link.classList.add('active');

      // Determine section-specific colors for active state
      const section = link.closest('.nav-section');
      if (!section) return;

      const toggle = section.querySelector<HTMLElement>('.section-toggle');
      if (!toggle) return;

      const sectionName = toggle.getAttribute('data-section');
      if (!sectionName) return;

      // Add section-specific active class
      link.classList.add(`active-${sectionName}`);

      // Expand parent section if needed
      const content = section.querySelector<HTMLElement>('.section-content');
      if (content) {
        toggle.setAttribute('data-expanded', 'true');
        content.style.maxHeight = `${content.scrollHeight}px`;
        content.style.overflow = 'visible';

        state[sectionName] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }
  });
}

/**
 * Initializes the sidebar functionality.
 * Sets up section toggles, scroll persistence, active page highlighting,
 * and mobile sidebar behavior.
 */
export function initSidebar(): void {
  const elements = getElements();
  const { sidebar, overlay, mobileMenuButton } = elements;

  // Restore scroll position
  restoreScrollPosition(sidebar);

  // Save scroll position when user scrolls
  if (sidebar) {
    setupScrollPersistence(sidebar);
  }

  // Set up section toggles
  const state = initSectionToggles();

  // Highlight active page
  highlightActivePage(state);

  // Mobile sidebar toggle
  if (mobileMenuButton && sidebar && overlay) {
    mobileMenuButton.addEventListener('click', () => {
      toggleMobileSidebar(elements);
    });

    overlay.addEventListener('click', () => {
      toggleMobileSidebar(elements, true);
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (
        window.innerWidth < 1024 &&
        !sidebar.contains(e.target as Node) &&
        !mobileMenuButton.contains(e.target as Node) &&
        !overlay.contains(e.target as Node) &&
        !sidebar.classList.contains('-translate-x-full')
      ) {
        toggleMobileSidebar(elements, true);
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        // Desktop: show sidebar, hide overlay, hide toggle button
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        elements.toggleBtn?.classList.add('opacity-0', 'pointer-events-none');
      } else {
        // Mobile: hide sidebar by default, show toggle button
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        elements.toggleBtn?.classList.remove('opacity-0', 'pointer-events-none');
      }
    });
  }
}
