import type { Logger } from '../../types/index.js';

/**
 * Creates a minimal fallback logger that uses console methods.
 * Used when no logger is provided to ensure basic logging functionality.
 *
 * @returns A Logger instance with basic console-based logging
 */
export function createFallbackLogger(): Logger {
  /* eslint-disable no-console */
  return {
    info: (msg: string) => console.log(msg),
    success: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(msg),
    warning: (msg: string) => console.warn(msg),
    status: (msg: string) => console.log(msg),
    building: (msg: string) => console.log(msg),
    processing: (msg: string) => console.log(msg),
    stats: (msg: string) => console.log(msg),
  };
  /* eslint-enable no-console */
}
