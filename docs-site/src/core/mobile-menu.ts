/**
 * Mobile menu.
 *
 * One header button (#menu-button) controls whichever panel its
 * aria-controls names: the docs sidebar drawer on docs pages, or the compact
 * nav panel on the homepage. Handles aria-expanded, Escape, outside clicks,
 * focus return, and keeps the closed drawer out of the tab order.
 */

const DESKTOP_QUERY = '(min-width: 1024px)';

export function initMobileMenu(): void {
  const button = document.getElementById('menu-button');
  const panelId = button?.getAttribute('aria-controls');
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!button || !panel) return;

  const isDrawer = panel.id === 'sidebar';
  const backdrop = document.getElementById('sidebar-backdrop');
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const openIcon = button.querySelector<HTMLElement>('[data-menu-icon="open"]');
  const closeIcon = button.querySelector<HTMLElement>('[data-menu-icon="close"]');

  const isOpen = (): boolean => button.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean, returnFocus = false): void => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (openIcon) openIcon.hidden = open;
    if (closeIcon) closeIcon.hidden = !open;

    if (isDrawer) {
      panel.dataset.open = String(open);
      panel.inert = !open && !desktop.matches;
      if (backdrop) backdrop.hidden = !open;
      document.documentElement.style.overflow = open ? 'hidden' : '';
    } else {
      panel.hidden = !open;
    }

    if (open) {
      panel
        .querySelector<HTMLElement>('[aria-current="page"], a, summary')
        ?.focus({ preventScroll: true });
    } else if (returnFocus) {
      button.focus();
    }
  };

  // Closed drawer must not be reachable by keyboard on small screens
  if (isDrawer) panel.inert = !desktop.matches;

  button.addEventListener('click', () => setOpen(!isOpen()));
  backdrop?.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, true);
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (isOpen() && !panel.contains(target) && !button.contains(target)) setOpen(false);
  });

  desktop.addEventListener('change', () => {
    setOpen(false);
    if (isDrawer) panel.inert = !desktop.matches;
  });
}
