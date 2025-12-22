import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, log } from '../../src/utils/logger.utils.js';

describe('logger.utils', () => {
  const originalEnv = process.env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Force color output in tests
    process.env = { ...originalEnv, FORCE_COLOR: '1' };
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('color functions', () => {
    it('should have brand color function', () => {
      const result = logger.brand('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[0m');
    });

    it('should have success color function', () => {
      const result = logger.success('success message');
      expect(result).toContain('\x1b[');
      expect(result).toContain('success message');
    });

    it('should have error color function', () => {
      const result = logger.error('error message');
      expect(result).toContain('\x1b[');
      expect(result).toContain('error message');
    });

    it('should have warning color function', () => {
      const result = logger.warning('warning message');
      expect(result).toContain('\x1b[');
      expect(result).toContain('warning message');
    });

    it('should have muted color function', () => {
      const result = logger.muted('muted text');
      expect(result).toContain('\x1b[');
      expect(result).toContain('muted text');
    });

    it('should have bold formatting function', () => {
      const result = logger.bold('bold text');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold text');
    });
  });

  describe('glyphs', () => {
    it('should have success glyph', () => {
      expect(logger.glyphs.success).toBe('✓');
    });

    it('should have error glyph', () => {
      expect(logger.glyphs.error).toBe('×');
    });

    it('should have warning glyph', () => {
      expect(logger.glyphs.warning).toBe('!');
    });

    it('should have bullet glyph', () => {
      expect(logger.glyphs.bullet).toBe('•');
    });
  });

  describe('logging methods', () => {
    it('should log messages with log method', () => {
      logger.log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should log warnings with warn method', () => {
      logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
    });

    it('should log errors with logError method', () => {
      logger.logError('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
    });
  });

  describe('NO_COLOR environment variable', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NO_COLOR: '1' };
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not apply ANSI codes when NO_COLOR is set', () => {
      const result = logger.brand('test');
      // When NO_COLOR is set, should return plain text without ANSI codes
      expect(result).toBe('test');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply bold formatting when NO_COLOR is set', () => {
      const result = logger.bold('bold text');
      expect(result).toBe('bold text');
      expect(result).not.toContain('\x1b[1m');
    });

    it('should not apply success color when NO_COLOR is set', () => {
      const result = logger.success('success');
      expect(result).toBe('success');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply error color when NO_COLOR is set', () => {
      const result = logger.error('error');
      expect(result).toBe('error');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply warning color when NO_COLOR is set', () => {
      const result = logger.warning('warning');
      expect(result).toBe('warning');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply muted color when NO_COLOR is set', () => {
      const result = logger.muted('muted');
      expect(result).toBe('muted');
      expect(result).not.toContain('\x1b[');
    });
  });

  describe('non-TTY environment', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });
      // Remove FORCE_COLOR so we rely on TTY detection
      process.env = { ...originalEnv };
      delete process.env.FORCE_COLOR;
      delete process.env.NO_COLOR;
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
      process.env = originalEnv;
    });

    it('should not apply ANSI codes when stdout is not a TTY', () => {
      const result = logger.brand('test');
      expect(result).toBe('test');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply bold when stdout is not a TTY', () => {
      const result = logger.bold('bold');
      expect(result).toBe('bold');
      expect(result).not.toContain('\x1b[1m');
    });
  });

  describe('FORCE_COLOR environment variable', () => {
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });
      // Set FORCE_COLOR to override non-TTY
      process.env = { ...originalEnv, FORCE_COLOR: '1' };
      delete process.env.NO_COLOR;
    });

    afterEach(() => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
      process.env = originalEnv;
    });

    it('should apply ANSI codes when FORCE_COLOR is set even if not TTY', () => {
      const result = logger.brand('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
    });

    it('should apply bold when FORCE_COLOR is set', () => {
      const result = logger.bold('bold');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold');
    });
  });

  describe('startup banner', () => {
    it('should display startup banner via logger', () => {
      logger.startupBanner();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Should contain ASCII art characters
      expect(output).toContain('█');
      expect(output).toContain('╗');
      // Should contain version info
      expect(output).toContain('create-stati');
    });
  });
});

describe('log object', () => {
  const originalEnv = process.env;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Force color output in tests
    process.env = { ...originalEnv, FORCE_COLOR: '1' };
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('logging methods', () => {
    it('should log success messages with checkmark glyph', () => {
      log.success('test success');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('✓');
      expect(output).toContain('test success');
    });

    it('should log error messages with cross glyph', () => {
      log.error('test error');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('×');
      expect(output).toContain('test error');
    });

    it('should log warning messages with warning glyph', () => {
      log.warning('test warning');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('!');
      expect(output).toContain('test warning');
    });

    it('should log info messages with brand color', () => {
      log.info('test info');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('test info');
      expect(output).toContain('\x1b['); // Has color
    });

    it('should log muted messages', () => {
      log.muted('test muted');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('test muted');
    });

    it('should log step messages with indentation', () => {
      log.step('test step');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('test step');
      expect(output).toContain('  '); // Has indentation
    });

    it('should log hint messages with arrow glyph', () => {
      log.hint('test hint');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('▸');
      expect(output).toContain('test hint');
    });

    it('should log blank line with newline method', () => {
      log.newline();

      expect(consoleLogSpy).toHaveBeenCalledWith();
    });
  });

  describe('startup banner', () => {
    it('should display startup banner', () => {
      log.startupBanner();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Should contain ASCII art characters
      expect(output).toContain('█');
      expect(output).toContain('╗');
      expect(output).toContain('╚');
      // Should contain version info
      expect(output).toContain('create-stati');
    });

    it('should include horizontal gradient in banner when colors enabled', () => {
      log.startupBanner();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string | undefined;
      expect(output).toBeDefined();
      // Gradient should produce multiple ANSI color codes
      // Use String.fromCharCode to avoid eslint no-control-regex
      const escapeChar = String.fromCharCode(27);
      const ansiPattern = new RegExp(`${escapeChar}\\[38;2;`, 'g');
      const ansiCount = (output!.match(ansiPattern) || []).length;
      expect(ansiCount).toBeGreaterThan(5);
    });
  });

  describe('color helpers', () => {
    it('should have bold function', () => {
      const result = log.bold('bold text');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold text');
    });

    it('should have brand function', () => {
      const result = log.brand('brand text');
      expect(result).toContain('\x1b[');
      expect(result).toContain('brand text');
    });
  });

  describe('NO_COLOR environment', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, NO_COLOR: '1' };
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not apply gradient when NO_COLOR is set', () => {
      log.startupBanner();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Should not contain ANSI RGB escape codes
      expect(output).not.toContain('\x1b[38;2;');
    });

    it('should log plain success message when NO_COLOR is set', () => {
      log.success('test');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('✓');
      expect(output).toContain('test');
      // No ANSI codes for colors
      expect(output).not.toContain('\x1b[38;2;');
    });

    it('should log plain error message when NO_COLOR is set', () => {
      log.error('test');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(output).not.toContain('\x1b[38;2;');
    });

    it('should log plain warning message when NO_COLOR is set', () => {
      log.warning('test');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0]?.[0] as string;
      expect(output).not.toContain('\x1b[38;2;');
    });
  });
});
