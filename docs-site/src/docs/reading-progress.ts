/**
 * Reading progress bar for docs pages.
 * Updates a top fixed indicator as the user scrolls through long pages.
 */

export function initReadingProgress(): void {
  const progressBar = document.getElementById('reading-progress');
  const mainContent = document.getElementById('main-content');

  if (!progressBar || !mainContent) return;

  const updateProgress = (): void => {
    const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (totalScrollable <= 0) {
      progressBar.style.width = '0%';
      return;
    }

    const percent = Math.min(100, Math.max(0, (window.scrollY / totalScrollable) * 100));
    progressBar.style.width = `${percent.toFixed(2)}%`;
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}
