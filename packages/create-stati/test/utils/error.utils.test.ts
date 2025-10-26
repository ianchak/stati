import { describe, it, expect } from 'vitest';
import { formatErrorMessage, createError } from '../../src/utils/error.utils.js';

describe('error.utils', () => {
  describe('formatErrorMessage', () => {
    it('should format Error instances and subclasses', () => {
      const error = new Error('Something went wrong');
      expect(formatErrorMessage(error)).toBe('Something went wrong');

      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const customError = new CustomError('Custom error message');
      expect(formatErrorMessage(customError)).toBe('Custom error message');
    });

    it('should format string errors', () => {
      expect(formatErrorMessage('Simple error string')).toBe('Simple error string');
    });

    it('should format objects with message property', () => {
      expect(formatErrorMessage({ message: 'Error from object' })).toBe('Error from object');
    });

    it('should use fallback for invalid error types', () => {
      // All invalid types should use default fallback
      expect(formatErrorMessage(null)).toBe('Unknown error');
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
      expect(formatErrorMessage(42)).toBe('Unknown error');
      expect(formatErrorMessage(true)).toBe('Unknown error');
      expect(formatErrorMessage(['error', 'array'])).toBe('Unknown error');
      expect(formatErrorMessage({})).toBe('Unknown error');
      expect(formatErrorMessage({ code: 'ENOENT' })).toBe('Unknown error');
      expect(formatErrorMessage({ message: 123 })).toBe('Unknown error');
    });

    it('should use custom fallback message when provided', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
      expect(formatErrorMessage(undefined, 'No error found')).toBe('No error found');
      expect(formatErrorMessage(123, 'Invalid error')).toBe('Invalid error');
    });
  });

  describe('createError', () => {
    it('should create Error with message', () => {
      const error = createError('Test error message');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
    });

    it('should create Error with cause when supported', () => {
      const cause = new Error('Original error');
      const error = createError('Wrapped error', cause);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Wrapped error');

      // Check if Error.cause is supported in the environment
      if ('cause' in Error.prototype) {
        expect((error as Error & { cause: unknown }).cause).toBe(cause);
      }
    });

    it('should handle various cause types gracefully', () => {
      // String cause
      const error1 = createError('Test error', 'string cause');
      expect(error1).toBeInstanceOf(Error);
      expect(error1.message).toBe('Test error');

      // Object cause
      const error2 = createError('Wrapped issue', { message: 'Original issue' });
      expect(error2).toBeInstanceOf(Error);
      expect(error2.message).toBe('Wrapped issue');

      // Null/undefined cause
      const error3 = createError('Test error', null);
      expect(error3).toBeInstanceOf(Error);
      expect(error3.message).toBe('Test error');

      const error4 = createError('Test error', undefined);
      expect(error4).toBeInstanceOf(Error);
      expect(error4.message).toBe('Test error');
    });
  });
});
