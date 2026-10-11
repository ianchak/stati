/**
 * Table of Contents scroll-spy.
 *
 * TOC links are server-rendered from stati.page.toc. This marks the link for
 * the heading currently in the reading zone and keeps the URL hash in sync
 * when a TOC link is used. Plain anchor navigation handles the scrolling, so
 * reduced-motion preferences are respected by CSS.
 */

/** Activation zone: below the sticky header, upper third of the viewport */
const OBSERVER_ROOT_MARGIN = '-80px 0px -66% 0px';

export function initToc(): void {
  const tocNav = document.getElementById('toc-nav');
  if (!tocNav) return;

  const links = Array.from(tocNav.querySelectorAll<HTMLAnchorElement>('a[data-target]'));
  if (links.length === 0) return;

  const setActive = (id: string): void => {
    links.forEach((link) => {
      const active = link.dataset.target === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const headings = links
    .map((link) => document.getElementById(link.dataset.target ?? ''))
    .filter((el): el is HTMLElement => el !== null);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0 },
  );

  headings.forEach((heading) => observer.observe(heading));

  if (window.location.hash) {
    setActive(decodeURIComponent(window.location.hash.slice(1)));
  }
}

/**
 * Scrolls the current page's sidebar link into view if it is outside the
 * visible part of the sidebar.
 */
export function revealCurrentSidebarLink(): void {
  const sidebar = document.getElementById('sidebar');
  const current = sidebar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!sidebar || !current) return;

  const top = current.offsetTop - sidebar.offsetTop;
  if (top < sidebar.scrollTop || top > sidebar.scrollTop + sidebar.clientHeight - 48) {
    sidebar.scrollTop = Math.max(0, top - sidebar.clientHeight / 3);
  }
}
