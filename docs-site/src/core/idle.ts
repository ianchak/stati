const IDLE_FALLBACK_DELAY_MS = 1;

/**
 * Schedules non-critical work during browser idle time.
 * Falls back to a tiny timeout when requestIdleCallback is unavailable.
 */
export function onIdle(callback: () => void): void {
  const scheduler = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (
        idleCallback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
      ) => number;
    }
  ).requestIdleCallback;

  if (typeof scheduler === 'function') {
    scheduler(() => {
      callback();
    });
    return;
  }

  globalThis.setTimeout(callback, IDLE_FALLBACK_DELAY_MS);
}
