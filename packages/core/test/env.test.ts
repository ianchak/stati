/**
 * Tests for environment utility functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setEnv, getEnv, isDevelopment, isProduction, isTest } from '../src/env.js';

describe('env utilities', () => {
  // Store the original env to restore after tests
  let originalEnv: string;

  beforeEach(() => {
    // Save current env before each test
    originalEnv = getEnv();
  });

  afterEach(() => {
    // Restore original env after each test
    setEnv(originalEnv as 'development' | 'production' | 'test');
  });

  describe('setEnv and getEnv', () => {
    it('should set and get development environment', () => {
      setEnv('development');
      expect(getEnv()).toBe('development');
    });

    it('should set and get production environment', () => {
      setEnv('production');
      expect(getEnv()).toBe('production');
    });

    it('should set and get test environment', () => {
      setEnv('test');
      expect(getEnv()).toBe('test');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when in development mode', () => {
      setEnv('development');
      expect(isDevelopment()).toBe(true);
    });

    it('should return false when in production mode', () => {
      setEnv('production');
      expect(isDevelopment()).toBe(false);
    });

    it('should return false when in test mode', () => {
      setEnv('test');
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when in production mode', () => {
      setEnv('production');
      expect(isProduction()).toBe(true);
    });

    it('should return false when in development mode', () => {
      setEnv('development');
      expect(isProduction()).toBe(false);
    });

    it('should return false when in test mode', () => {
      setEnv('test');
      expect(isProduction()).toBe(false);
    });
  });

  describe('isTest', () => {
    it('should return true when in test mode', () => {
      setEnv('test');
      expect(isTest()).toBe(true);
    });

    it('should return false when in development mode', () => {
      setEnv('development');
      expect(isTest()).toBe(false);
    });

    it('should return false when in production mode', () => {
      setEnv('production');
      expect(isTest()).toBe(false);
    });
  });

  describe('environment switching', () => {
    it('should allow switching between environments multiple times', () => {
      setEnv('development');
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);

      setEnv('production');
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);

      setEnv('test');
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });
});
