/**
 * Error thrown when the Stati configuration is invalid.
 * `loadConfig()` always rethrows it, because the build cannot proceed with a broken config.
 */
export class ConfigValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConfigValidationError';
  }
}
