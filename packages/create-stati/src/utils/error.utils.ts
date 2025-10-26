/**
 * Error formatting utilities for consistent error handling across create-stati
 */

/**
 * Format an unknown error into a user-friendly message string.
 * Safely extracts the error message from Error objects or converts other types.
 *
 * @param error - The error to format (can be Error, string, or any unknown type)
 * @param fallback - Fallback message if error cannot be formatted (default: 'Unknown error')
 * @returns Formatted error message string
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   throw new Error(`Failed to process: ${formatErrorMessage(error)}`);
 * }
 * ```
 */
export function formatErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return fallback;
}

/**
 * Create an Error with a formatted message, optionally preserving the cause.
 * Useful for wrapping caught errors with additional context.
 *
 * @param message - The error message to use
 * @param cause - Optional underlying error to preserve as cause
 * @returns A new Error instance with formatted message
 *
 * @example
 * ```ts
 * try {
 *   await setupFile();
 * } catch (error) {
 *   throw createError('Failed to setup file', error);
 * }
 * ```
 */
export function createError(message: string, cause?: unknown): Error {
  const error = new Error(message);
  if (cause) {
    // Use Error.cause if available (Node 16.9+)
    if ('cause' in Error.prototype) {
      (error as Error & { cause: unknown }).cause = cause;
    }
  }
  return error;
}
