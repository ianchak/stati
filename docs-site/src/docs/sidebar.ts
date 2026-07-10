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
  if (!path) return '/';

  let normalized = path.trim();

  // Support absolute URLs and raw href values uniformly.
  try {
    normalized = new URL(normalized, window.location.origin).pathname;
  } catch {
    // Keep raw value if URL parsing fails.
  }

  // Strip query/hash if present and decode URL-safe chars.
  normalized = normalized.split('#')[0]?.split('?')[0] || '/';
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep undecoded value if malformed encoding is present.
  }

  // Ensure leading slash for relative links.
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // Remove index.html and collapse duplicate slashes.
  normalized = normalized.replace(/\/index\.html$/, '/').replace(/\/+/g, '/');

  // Normalize trailing slash (except root).
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized || '/';
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
 * Collapses a section content element with animation.
 */
function collapseSection(content: HTMLElement): void {
  // Hide overflow immediately to clip content during animation
  content.style.overflow = 'hidden';
  // Set explicit height first to enable transition from current height
  content.style.maxHeight = `${content.scrollHeight}px`;
  // Force reflow to ensure the browser registers the explicit height
  void content.offsetHeight;
  // Now animate to 0
  content.style.maxHeight = '0px';
}

/**
 * Expands a section content element with animation.
 */
function expandSection(content: HTMLElement): void {
  // Start from 0 if not already set
  if (!content.style.maxHeight || content.style.maxHeight === 'none') {
    content.style.maxHeight = '0px';
    void content.offsetHeight;
  }

  // Animate to scrollHeight (keep overflow hidden during animation)
  content.style.maxHeight = `${content.scrollHeight}px`;

  // After transition, allow natural sizing and visible overflow
  const onTransitionEnd = (): void => {
    content.style.maxHeight = 'none';
    content.style.overflow = 'visible';
    content.removeEventListener('transitionend', onTransitionEnd);
  };
  content.addEventListener('transitionend', onTransitionEnd);
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

    // Set initial state without animation
    if (content) {
      if (isExpanded) {
        toggle.setAttribute('data-expanded', 'true');
        // Use 'none' for expanded state to avoid Safari scrollHeight issues
        content.style.maxHeight = 'none';
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
          collapseSection(content);
        }
        state[sectionName] = false;
      } else {
        toggle.setAttribute('data-expanded', 'true');
        if (content) {
          expandSection(content);
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
 * Returns the active link element if found.
 */
function highlightActivePage(state: SectionState): HTMLAnchorElement | null {
  const serverActiveLink = document.querySelector<HTMLAnchorElement>('.sidebar-link.active');
  if (serverActiveLink) {
    const section = serverActiveLink.closest('.nav-section');
    const toggle = section?.querySelector<HTMLElement>('.section-toggle');
    const sectionName = toggle?.getAttribute('data-section');
    const content = section?.querySelector<HTMLElement>('.section-content');

    if (toggle && sectionName && content) {
      toggle.setAttribute('data-expanded', 'true');
      content.style.maxHeight = `${content.scrollHeight}px`;
      content.style.overflow = 'visible';

      state[sectionName] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    return serverActiveLink;
  }

  const currentPath = window.location.pathname;
  const normalizedCurrentPath = normalizePath(currentPath);
  let activeLink: HTMLAnchorElement | null = null;
  let activePath = '';

  // Clear any stale active classes before applying the new one.
  document.querySelectorAll<HTMLAnchorElement>('.sidebar-link').forEach((link) => {
    link.classList.remove('active');
    for (const className of Array.from(link.classList)) {
      if (className.startsWith('active-')) {
        link.classList.remove(className);
      }
    }
  });

  document.querySelectorAll<HTMLAnchorElement>('.sidebar-link').forEach((link) => {
    const linkHref = link.getAttribute('href');
    if (!linkHref) return;

    const normalizedLinkHref = normalizePath(linkHref);

    const isExactMatch = normalizedLinkHref === normalizedCurrentPath;
    const isParentMatch =
      normalizedLinkHref !== '/' && normalizedCurrentPath.startsWith(`${normalizedLinkHref}/`);

    if (isExactMatch || isParentMatch) {
      // Pick the most specific matching path.
      if (normalizedLinkHref.length >= activePath.length) {
        activePath = normalizedLinkHref;
        activeLink = link;
      }
    }
  });

  if (!activeLink) {
    return null;
  }

  const resolvedActiveLink = activeLink as HTMLAnchorElement;

  // Add the active class.
  resolvedActiveLink.classList.add('active');

  // Determine section-specific colors for active state.
  const section = resolvedActiveLink.closest('.nav-section');
  if (!section) return resolvedActiveLink;

  const toggle = section.querySelector<HTMLElement>('.section-toggle');
  if (!toggle) return resolvedActiveLink;

  const sectionName = toggle.getAttribute('data-section');
  if (!sectionName) return resolvedActiveLink;

  // Add section-specific active class.
  resolvedActiveLink.classList.add(`active-${sectionName}`);

  // Expand parent section if needed.
  const content = section.querySelector<HTMLElement>('.section-content');
  if (content) {
    toggle.setAttribute('data-expanded', 'true');
    content.style.maxHeight = `${content.scrollHeight}px`;
    content.style.overflow = 'visible';

    state[sectionName] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return resolvedActiveLink;
}

/**
 * Ensures the active link is visible within the sidebar viewport.
 * Only scrolls if the active item is outside the visible area.
 */
function ensureActiveItemVisible(sidebar: HTMLElement, activeLink: HTMLAnchorElement): void {
  // Wait a frame so expanded section heights are applied before scrolling.
  requestAnimationFrame(() => {
    try {
      activeLink.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    } catch {
      // Fallback for environments where scrollIntoView options are unsupported.
      const sidebarRect = sidebar.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const linkTopRelativeToSidebar = linkRect.top - sidebarRect.top + sidebar.scrollTop;
      const linkBottomRelativeToSidebar = linkTopRelativeToSidebar + linkRect.height;
      const visibleTop = sidebar.scrollTop;
      const visibleBottom = sidebar.scrollTop + sidebar.clientHeight;
      const padding = 5;

      if (linkTopRelativeToSidebar < visibleTop + padding) {
        sidebar.scrollTop = linkTopRelativeToSidebar - padding;
      } else if (linkBottomRelativeToSidebar > visibleBottom - padding) {
        sidebar.scrollTop = linkBottomRelativeToSidebar - sidebar.clientHeight + padding;
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

  // Set up section toggles first (needed before highlighting)
  const state = initSectionToggles();

  // Highlight active page and get the active link
  const activeLink = highlightActivePage(state);

  // Restore scroll position
  restoreScrollPosition(sidebar);

  // Ensure active item is visible (overrides scroll position if needed)
  if (sidebar && activeLink) {
    ensureActiveItemVisible(sidebar, activeLink);
  }

  // Save scroll position when user scrolls
  if (sidebar) {
    setupScrollPersistence(sidebar);
  }

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

    // On mobile, close sidebar after selecting a destination link.
    sidebar.querySelectorAll<HTMLAnchorElement>('a.sidebar-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          toggleMobileSidebar(elements, true);
        }
      });
    });
  }
}
