import { describe, it, expect } from 'vitest';
import { formatErrorMessage, createError } from '../../src/utils/error.utils.js';

describe('error.utils', () => {
  describe('formatErrorMessage', () => {
    it('should format Error instance', () => {
      const error = new Error('Something went wrong');
      expect(formatErrorMessage(error)).toBe('Something went wrong');
    });

    it('should format string error', () => {
      const error = 'Simple error string';
      expect(formatErrorMessage(error)).toBe('Simple error string');
    });

    it('should format object with message property', () => {
      const error = { message: 'Error from object' };
      expect(formatErrorMessage(error)).toBe('Error from object');
    });

    it('should handle object with non-string message', () => {
      const error = { message: 123 };
      expect(formatErrorMessage(error)).toBe('Unknown error');
    });

    it('should use fallback for null', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error');
    });

    it('should use fallback for undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should use fallback for number', () => {
      expect(formatErrorMessage(42)).toBe('Unknown error');
    });

    it('should use fallback for boolean', () => {
      expect(formatErrorMessage(true)).toBe('Unknown error');
    });

    it('should use fallback for array', () => {
      expect(formatErrorMessage(['error', 'array'])).toBe('Unknown error');
    });

    it('should use custom fallback message', () => {
      expect(formatErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
      expect(formatErrorMessage(undefined, 'No error found')).toBe('No error found');
      expect(formatErrorMessage(123, 'Invalid error')).toBe('Invalid error');
    });

    it('should handle object without message property', () => {
      const error = { code: 'ENOENT', path: '/test' };
      expect(formatErrorMessage(error)).toBe('Unknown error');
    });

    it('should handle empty object', () => {
      expect(formatErrorMessage({})).toBe('Unknown error');
    });

    it('should handle Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      expect(formatErrorMessage(error)).toBe('Custom error message');
    });
  });

  describe('createError', () => {
    it('should create Error with message', () => {
      const error = createError('Test error message');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error message');
    });

    it('should create Error with cause if supported', () => {
      const cause = new Error('Original error');
      const error = createError('Wrapped error', cause);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Wrapped error');

      // Check if Error.cause is supported in the environment
      if ('cause' in Error.prototype) {
        expect((error as Error & { cause: unknown }).cause).toBe(cause);
      }
    });

    it('should handle string cause', () => {
      const error = createError('Test error', 'string cause');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should handle object cause', () => {
      const cause = { message: 'Original issue' };
      const error = createError('Wrapped issue', cause);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Wrapped issue');
    });

    it('should handle null cause', () => {
      const error = createError('Test error', null);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should handle undefined cause', () => {
      const error = createError('Test error', undefined);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should create Error without cause', () => {
      const error = createError('Simple error');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Simple error');
    });
  });
});
