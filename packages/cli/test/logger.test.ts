import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with all required methods', () => {
      const logger = createLogger();

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('success');
      expect(logger).toHaveProperty('warning');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('building');
      expect(logger).toHaveProperty('processing');
      expect(logger).toHaveProperty('stats');

      expect(typeof logger.info).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.warning).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.building).toBe('function');
      expect(typeof logger.processing).toBe('function');
      expect(typeof logger.stats).toBe('function');
    });

    it('should create logger with info method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.info('test info message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with success method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.success('test success message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with warning method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logger = createLogger();

      logger.warning('test warning message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with error method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logger = createLogger();

      logger.error('test error message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with building method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.building('test building message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with processing method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.processing('test processing message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create logger with stats method that logs messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger();

      logger.stats('test stats message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
