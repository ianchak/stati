import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFallbackLogger } from '../../../src/core/utils/logger.utils.js';

describe('Logger Utils', () => {
  describe('createFallbackLogger', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should create a logger with all required methods', () => {
      const logger = createFallbackLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warning).toBe('function');
      expect(typeof logger.building).toBe('function');
      expect(typeof logger.processing).toBe('function');
      expect(typeof logger.stats).toBe('function');
    });

    it('should log info messages to console.log', () => {
      const logger = createFallbackLogger();
      const message = 'This is an info message';

      logger.info(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log success messages to console.log', () => {
      const logger = createFallbackLogger();
      const message = 'Build completed successfully!';

      logger.success(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error messages to console.error', () => {
      const logger = createFallbackLogger();
      const message = 'Build failed with error';

      logger.error(message);

      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log warning messages to console.warn', () => {
      const logger = createFallbackLogger();
      const message = 'Deprecated API usage detected';

      logger.warning(message);

      expect(consoleWarnSpy).toHaveBeenCalledWith(message);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should log building messages to console.log', () => {
      const logger = createFallbackLogger();
      const message = 'Building pages...';

      logger.building(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log processing messages to console.log', () => {
      const logger = createFallbackLogger();
      const message = 'Processing markdown files...';

      logger.processing(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log stats messages to console.log', () => {
      const logger = createFallbackLogger();
      const message = 'Built 42 pages in 1.5s';

      logger.stats(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(message);
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple log calls correctly', () => {
      const logger = createFallbackLogger();

      logger.info('Starting build...');
      logger.building('Building pages...');
      logger.processing('Processing content...');
      logger.success('Build complete!');

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'Starting build...');
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'Building pages...');
      expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'Processing content...');
      expect(consoleLogSpy).toHaveBeenNthCalledWith(4, 'Build complete!');
    });

    it('should handle mixed log levels correctly', () => {
      const logger = createFallbackLogger();

      logger.info('Starting...');
      logger.warning('Warning: deprecated feature');
      logger.error('Error occurred');
      logger.success('Operation completed');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should create independent logger instances', () => {
      const logger1 = createFallbackLogger();
      const logger2 = createFallbackLogger();

      logger1.info('Logger 1 message');
      logger2.info('Logger 2 message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'Logger 1 message');
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'Logger 2 message');
    });

    it('should handle empty messages', () => {
      const logger = createFallbackLogger();

      logger.info('');
      logger.error('');
      logger.warning('');

      expect(consoleLogSpy).toHaveBeenCalledWith('');
      expect(consoleErrorSpy).toHaveBeenCalledWith('');
      expect(consoleWarnSpy).toHaveBeenCalledWith('');
    });

    it('should handle special characters in messages', () => {
      const logger = createFallbackLogger();
      const specialMessage = 'Test 📦 with emojis and\nnewlines\ttabs';

      logger.info(specialMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith(specialMessage);
    });

    it('should handle very long messages', () => {
      const logger = createFallbackLogger();
      const longMessage = 'A'.repeat(10000);

      logger.info(longMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith(longMessage);
    });
  });
});
