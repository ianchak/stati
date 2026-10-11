/**
 * Scroll to top button functionality.
 * Shows/hides a button based on scroll position and scrolls to top on click.
 */

/** Scroll threshold in pixels before showing the button */
const SCROLL_THRESHOLD = 300;

/**
 * Initializes the scroll-to-top button functionality.
 * Shows the button when page is scrolled past threshold, hides otherwise.
 */
export function initScrollToTop(): void {
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  if (!scrollToTopBtn) return;

  // Show/hide button based on scroll position
  const scrollHandler = (): void => {
    if (window.pageYOffset > SCROLL_THRESHOLD) {
      scrollToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
      scrollToTopBtn.classList.add('opacity-100');
    } else {
      scrollToTopBtn.classList.add('opacity-0', 'pointer-events-none');
      scrollToTopBtn.classList.remove('opacity-100');
    }
  };

  window.addEventListener('scroll', scrollHandler, { passive: true });

  // Smooth scroll to top on click
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
