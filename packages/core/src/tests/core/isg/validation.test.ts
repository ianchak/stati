import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateISGConfig,
  ISGConfigurationError,
  ISGValidationError,
} from '../../../core/isg/validation.js';
import type { ISGConfig } from '../../../types/index.js';

describe('ISG Error Handling and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should validate valid ISG configuration', () => {
      const validConfig: ISGConfig = {
        enabled: true,
        ttlSeconds: 3600,
        maxAgeCapDays: 365,
        aging: [
          { untilDays: 7, ttlSeconds: 1800 },
          { untilDays: 30, ttlSeconds: 7200 },
        ],
      };

      expect(() => validateISGConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid TTL values', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        ttlSeconds: -100, // Invalid negative TTL
      };

      expect(() => validateISGConfig(invalidConfig)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.code).toBe(ISGValidationError.INVALID_TTL);
        expect(configError.field).toBe('ttlSeconds');
        expect(configError.value).toBe(-100);
        expect(configError.message).toContain('cannot be negative');
      }
    });

    it('should reject invalid max age cap values', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        maxAgeCapDays: 0, // Invalid zero value
      };

      expect(() => validateISGConfig(invalidConfig)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.code).toBe(ISGValidationError.INVALID_MAX_AGE_CAP);
        expect(configError.field).toBe('maxAgeCapDays');
      }
    });

    it('should reject unsorted aging rules', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 30, ttlSeconds: 7200 },
          { untilDays: 7, ttlSeconds: 1800 }, // Out of order
        ],
      };

      expect(() => validateISGConfig(invalidConfig)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.code).toBe(ISGValidationError.UNSORTED_AGING_RULES);
        expect(configError.message).toContain('must be sorted by untilDays');
      }
    });

    it('should reject duplicate aging rules', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 7, ttlSeconds: 1800 },
          { untilDays: 7, ttlSeconds: 3600 }, // Duplicate untilDays
        ],
      };

      expect(() => validateISGConfig(invalidConfig)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.code).toBe(ISGValidationError.DUPLICATE_AGING_RULE);
        expect(configError.message).toContain('Duplicate aging rule');
      }
    });

    it('should reject aging rules that exceed max age cap', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        maxAgeCapDays: 30,
        aging: [
          { untilDays: 7, ttlSeconds: 1800 },
          { untilDays: 60, ttlSeconds: 7200 }, // Exceeds maxAgeCapDays
        ],
      };

      expect(() => validateISGConfig(invalidConfig)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.code).toBe(ISGValidationError.AGING_RULE_EXCEEDS_CAP);
        expect(configError.message).toContain('exceeds maxAgeCapDays');
      }
    });

    it('should handle undefined config gracefully', () => {
      expect(() => validateISGConfig(undefined as unknown as ISGConfig)).not.toThrow();
    });

    it('should provide actionable error messages', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        ttlSeconds: 'invalid' as unknown as number, // Wrong type
      };

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.message).toContain('must be a positive integer');
        expect(configError.message).toContain('Example:');
      }
    });
  });

  describe('Edge Case Handling', () => {
    it('should handle extremely large TTL values', () => {
      const configWithLargeTTL: ISGConfig = {
        enabled: true,
        ttlSeconds: 400 * 24 * 3600, // More than 1 year
      };

      expect(() => validateISGConfig(configWithLargeTTL)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(configWithLargeTTL);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.message).toContain('unusually large');
        expect(configError.message).toContain('maxAgeCapDays');
      }
    });

    it('should handle non-integer TTL values', () => {
      const configWithFloatTTL: ISGConfig = {
        enabled: true,
        ttlSeconds: 3600.5, // Float instead of integer
      };

      expect(() => validateISGConfig(configWithFloatTTL)).toThrow(ISGConfigurationError);
    });

    it('should handle invalid aging rule structures', () => {
      const configWithInvalidRule: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 7, ttlSeconds: 1800 },
          null as unknown as { untilDays: number; ttlSeconds: number }, // Null rule
          { untilDays: 30, ttlSeconds: 7200 },
        ],
      };

      expect(() => validateISGConfig(configWithInvalidRule)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(configWithInvalidRule);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.field).toContain('aging[1]');
        expect(configError.message).toContain('null or undefined');
      }
    });

    it('should handle aging rules with missing fields', () => {
      const configWithIncompleteRule: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 7 } as unknown as { untilDays: number; ttlSeconds: number }, // Missing ttlSeconds
        ],
      };

      expect(() => validateISGConfig(configWithIncompleteRule)).toThrow(ISGConfigurationError);
    });

    it('should handle negative aging rule values', () => {
      const configWithNegativeValues: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: -7, ttlSeconds: 1800 }, // Negative untilDays
        ],
      };

      expect(() => validateISGConfig(configWithNegativeValues)).toThrow(ISGConfigurationError);
    });

    it('should handle extremely large aging rule TTL values', () => {
      const configWithLargeRuleTTL: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 7, ttlSeconds: 40 * 24 * 3600 }, // More than 30 days
        ],
      };

      expect(() => validateISGConfig(configWithLargeRuleTTL)).toThrow(ISGConfigurationError);

      try {
        validateISGConfig(configWithLargeRuleTTL);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.message).toContain('unusually large');
        expect(configError.message).toContain('30 days');
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide specific field information in errors', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        aging: [
          { untilDays: 7, ttlSeconds: -100 }, // Invalid TTL in aging rule
        ],
      };

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.field).toBe('aging[0].ttlSeconds');
        expect(configError.value).toBe(-100);
      }
    });

    it('should provide context about the validation failure', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        maxAgeCapDays: 10000, // Extremely large value
      };

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.message).toContain('unusually large');
        expect(configError.message).toContain('10 years');
        expect(configError.message).toContain('intended');
      }
    });

    it('should include examples in error messages', () => {
      const invalidConfig: ISGConfig = {
        enabled: true,
        ttlSeconds: 'string' as unknown as number,
      };

      try {
        validateISGConfig(invalidConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(ISGConfigurationError);
        const configError = error as ISGConfigurationError;
        expect(configError.message).toContain('Example:');
        expect(configError.message).toContain('3600');
      }
    });
  });

  describe('Structured Error Codes', () => {
    it('should use consistent error codes for similar issues', () => {
      const configs = [
        { ttlSeconds: -1 },
        { ttlSeconds: 'invalid' as unknown as number },
        { ttlSeconds: null as unknown as number },
      ];

      for (const config of configs) {
        try {
          validateISGConfig(config as ISGConfig);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(ISGConfigurationError);
          const configError = error as ISGConfigurationError;
          expect(configError.code).toBe(ISGValidationError.INVALID_TTL);
        }
      }
    });

    it('should differentiate between different types of validation errors', () => {
      const errorCodes = new Set<ISGValidationError>();

      const testConfigs = [
        { ttlSeconds: -1, expectedCode: ISGValidationError.INVALID_TTL },
        { maxAgeCapDays: -1, expectedCode: ISGValidationError.INVALID_MAX_AGE_CAP },
        {
          aging: [null as unknown as { untilDays: number; ttlSeconds: number }],
          expectedCode: ISGValidationError.INVALID_AGING_RULE,
        },
      ];

      for (const { expectedCode, ...config } of testConfigs) {
        try {
          validateISGConfig(config as ISGConfig);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(ISGConfigurationError);
          const configError = error as ISGConfigurationError;
          expect(configError.code).toBe(expectedCode);
          errorCodes.add(configError.code);
        }
      }

      // Ensure we're testing different error codes
      expect(errorCodes.size).toBeGreaterThan(1);
    });
  });
});
