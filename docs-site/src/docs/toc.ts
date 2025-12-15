/**
 * Table of Contents scroll-spy functionality.
 * TOC links are server-rendered via stati.page.toc; this module handles
 * smooth scrolling and active section highlighting using IntersectionObserver.
 */

/** Selector for headings to track for scroll-spy */
const HEADING_SELECTOR = 'h2[id], h3[id], h4[id], h5[id], h6[id]';

/**
 * Root margin for IntersectionObserver.
 * Values: top, right, bottom, left
 * - Top: -80px accounts for fixed header height
 * - Bottom: -66% creates an activation zone in the upper third of viewport
 * This ensures headings are highlighted when they're in the readable area,
 * not when they're at the very edge of the viewport.
 */
const OBSERVER_ROOT_MARGIN = '-80px 0px -66% 0px';

/**
 * Updates the active state of TOC links.
 */
function updateActiveLink(activeId: string, links: HTMLAnchorElement[], tocNav: HTMLElement): void {
  // Remove active state from all links
  links.forEach((link) => {
    link.classList.remove(
      'text-blue-600',
      'dark:text-blue-400',
      'border-blue-600',
      'dark:border-blue-400',
      'font-medium',
      'bg-blue-50',
      'dark:bg-blue-900/20',
    );
    link.classList.add('text-gray-600', 'dark:text-gray-300');
  });

  // Add active state to current link
  const activeLink = tocNav.querySelector<HTMLAnchorElement>(`[data-target="${activeId}"]`);
  if (activeLink) {
    activeLink.classList.remove('text-gray-600', 'dark:text-gray-300');
    activeLink.classList.add(
      'text-blue-600',
      'dark:text-blue-400',
      'border-blue-600',
      'dark:border-blue-400',
      'font-medium',
      'bg-blue-50',
      'dark:bg-blue-900/20',
    );
  }
}

/**
 * Initializes the Table of Contents scroll-spy functionality.
 * TOC links are server-rendered; this sets up smooth scrolling and active highlighting.
 */
export function initToc(): void {
  const tocNav = document.getElementById('toc-nav');
  if (!tocNav) return;

  // Get server-rendered TOC links
  const links = Array.from(tocNav.querySelectorAll<HTMLAnchorElement>('a[data-target]'));
  if (links.length === 0) return;

  // Smooth scroll to section on click
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const targetId = link.getAttribute('data-target');
      const targetElement = targetId ? document.getElementById(targetId) : null;

      if (targetElement) {
        // Smooth scroll to the target
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        // Update URL hash
        history.pushState(null, '', `#${targetId}`);
      }
    });
  });

  // Highlight active section on scroll using IntersectionObserver
  const headingElements = document.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            updateActiveLink(id, links, tocNav);
          }
        }
      });
    },
    {
      rootMargin: OBSERVER_ROOT_MARGIN,
      threshold: 0,
    },
  );

  // Observe all headings
  headingElements.forEach((heading) => {
    observer.observe(heading);
  });

  // Handle initial hash on page load
  if (window.location.hash) {
    const targetId = window.location.hash.substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      updateActiveLink(targetId, links, tocNav);

      // Smooth scroll to target after a brief delay to ensure page is loaded
      setTimeout(() => {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }
}
