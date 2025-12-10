/**
 * Table of Contents functionality.
 * Generates TOC from page headings, handles smooth scrolling, and highlights
 * the active section using IntersectionObserver.
 */

/** Selector for headings to include in TOC */
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

interface HeadingEntry {
  id: string;
  text: string;
  level: number;
}

/**
 * Gets the indentation class based on heading level.
 */
function getIndentClass(level: number): string {
  const indents: Record<number, string> = {
    2: 'pl-3',
    3: 'pl-6',
    4: 'pl-9',
    5: 'pl-12',
    6: 'pl-16',
  };
  return indents[level] || 'pl-3';
}

/**
 * Generates TOC links from headings.
 */
function generateTocLinks(headings: HeadingEntry[], tocNav: HTMLElement): HTMLAnchorElement[] {
  const links: HTMLAnchorElement[] = [];

  headings.forEach((heading) => {
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.className = `block text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors duration-200 py-1 border-l-2 border-transparent hover:border-blue-600 dark:hover:border-blue-400 rounded-r no-underline ${getIndentClass(heading.level)}`;
    link.setAttribute('data-target', heading.id);
    link.textContent = heading.text;
    tocNav.appendChild(link);
    links.push(link);
  });

  return links;
}

/**
 * Gets all headings with IDs from the content.
 */
function getHeadings(): HeadingEntry[] {
  const headings = document.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR);
  return Array.from(headings)
    .filter((h) => h.id && h.textContent?.trim())
    .map((heading) => ({
      id: heading.id,
      text: heading.textContent?.trim() || '',
      level: parseInt(heading.tagName.charAt(1), 10),
    }));
}

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
 * Hides the TOC container while preserving layout space.
 * Uses visibility:hidden to prevent layout shift.
 */
function hideToc(tocContainer: HTMLElement): void {
  tocContainer.style.visibility = 'hidden';
  tocContainer.setAttribute('aria-hidden', 'true');
}

/**
 * Removes the skeleton placeholder from the TOC nav.
 */
function removeSkeleton(): void {
  const skeleton = document.getElementById('toc-skeleton');
  if (skeleton) {
    skeleton.remove();
  }
}

/**
 * Initializes the Table of Contents functionality.
 * Sets up TOC generation, smooth scrolling, and scroll spy with IntersectionObserver.
 */
export function initToc(): void {
  const toc = document.getElementById('toc');
  const tocContainer = document.getElementById('toc-container');
  const tocNav = document.getElementById('toc-nav');
  if (!toc || !tocContainer || !tocNav) return;

  // Get all headings with IDs from the content
  const headingEntries = getHeadings();

  if (headingEntries.length === 0) {
    // Hide TOC if no headings found (use visibility to preserve layout)
    removeSkeleton();
    hideToc(tocContainer);
    return;
  }

  // Remove skeleton before generating links
  removeSkeleton();

  // Generate TOC links
  const links = generateTocLinks(headingEntries, tocNav);

  // If we have less than 2 headings, hide the TOC
  if (links.length < 2) {
    hideToc(tocContainer);
    return;
  }

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
