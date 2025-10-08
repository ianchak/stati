import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../src/logger.js';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLogger', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

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
      const logger = createLogger();

      logger.info('test info message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should create logger with success method that logs messages', () => {
      const logger = createLogger();

      logger.success('test success message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should create logger with warning method that logs messages', () => {
      const logger = createLogger();

      logger.warning('test warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should create logger with error method that logs messages', () => {
      const logger = createLogger();

      logger.error('test error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should create logger with building method that logs messages', () => {
      const logger = createLogger();

      logger.building('test building message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should create logger with processing method that logs messages', () => {
      const logger = createLogger();

      logger.processing('test processing message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should create logger with stats method that logs messages', () => {
      const logger = createLogger();

      logger.stats('test stats message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
