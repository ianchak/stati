/**
 * Rebuild log playback.
 *
 * The ISG example log on the homepage resolves row by row the first time it
 * scrolls into view, like a build deciding page by page. The static table is
 * complete without this script; under reduced motion nothing animates.
 */

const STEP_MS = 140;

export function initRebuildLog(): void {
  const log = document.querySelector<HTMLElement>('[data-rebuild-log]');
  if (!log) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rows = Array.from(log.querySelectorAll<HTMLElement>('.log-row'));
  rows.forEach((row) => row.classList.add('is-pending'));

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      rows.forEach((row, index) => {
        window.setTimeout(() => row.classList.remove('is-pending'), STEP_MS * (index + 1));
      });
    },
    { threshold: 0.4 },
  );

  observer.observe(log);
}
