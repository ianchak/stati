const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MotionChangeEvent = { matches: boolean };
type MotionChangeListener = (event: MotionChangeEvent) => void;
type MotionMediaQuery = {
  matches: boolean;
  addEventListener?: (type: 'change', listener: MotionChangeListener) => void;
  removeEventListener?: (type: 'change', listener: MotionChangeListener) => void;
  addListener?: (listener: MotionChangeListener) => void;
  removeListener?: (listener: MotionChangeListener) => void;
};

/**
 * Returns whether the user currently prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  const mediaQuery = getReducedMotionMediaQuery();
  return mediaQuery?.matches ?? false;
}

/**
 * Subscribes to reduced-motion preference changes.
 * Returns a cleanup function that removes the listener.
 */
export function onReducedMotionChange(
  callback: (prefersReducedMotion: boolean) => void,
): () => void {
  const mediaQuery = getReducedMotionMediaQuery();
  if (!mediaQuery) {
    return () => {};
  }

  const listener: MotionChangeListener = (event) => {
    callback(event.matches);
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return () => {
      mediaQuery.removeEventListener?.('change', listener);
    };
  }

  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(listener);
    return () => {
      mediaQuery.removeListener?.(listener);
    };
  }

  return () => {};
}

function getReducedMotionMediaQuery(): MotionMediaQuery | null {
  const matchMedia = (window as { matchMedia?: (query: string) => MotionMediaQuery }).matchMedia;
  if (typeof matchMedia !== 'function') {
    return null;
  }

  return matchMedia(REDUCED_MOTION_QUERY);
}
