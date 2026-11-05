import type { ISGConfig, AgingRule } from '../../types/index.js';

/**
 * Error codes for ISG validation failures.
 * These provide structured error identification for better debugging.
 */
export enum ISGValidationError {
  INVALID_TTL = 'ISG_INVALID_TTL',
  INVALID_MAX_AGE_CAP = 'ISG_INVALID_MAX_AGE_CAP',
  INVALID_AGING_RULE = 'ISG_INVALID_AGING_RULE',
  DUPLICATE_AGING_RULE = 'ISG_DUPLICATE_AGING_RULE',
  UNSORTED_AGING_RULES = 'ISG_UNSORTED_AGING_RULES',
  AGING_RULE_EXCEEDS_CAP = 'ISG_AGING_RULE_EXCEEDS_CAP',
}

/**
 * Represents a validation error with context and actionable message.
 */
export class ISGConfigurationError extends Error {
  constructor(
    public readonly code: ISGValidationError,
    public readonly field: string,
    public readonly value: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ISGConfigurationError';
  }
}

/**
 * Validates ISG configuration and provides actionable error messages.
 * Throws ISGConfigurationError for invalid configurations.
 *
 * @param config - ISG configuration to validate
 * @throws {ISGConfigurationError} When configuration is invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateISGConfig(userConfig.isg);
 * } catch (error) {
 *   if (error instanceof ISGConfigurationError) {
 *     console.error(`${error.code}: ${error.message}`);
 *     console.error(`Field: ${error.field}, Value: ${error.value}`);
 *   }
 * }
 * ```
 */
export function validateISGConfig(config: ISGConfig): void {
  if (!config) {
    return; // Config is optional
  }

  // Validate TTL seconds
  if (config.ttlSeconds !== undefined) {
    validateTTLSeconds(config.ttlSeconds);
  }

  // Validate max age cap
  if (config.maxAgeCapDays !== undefined) {
    validateMaxAgeCapDays(config.maxAgeCapDays);
  }

  // Validate aging rules
  if (config.aging && Array.isArray(config.aging)) {
    validateAgingRules(config.aging, config.maxAgeCapDays);
  }
}

/**
 * Validates TTL seconds value.
 */
function validateTTLSeconds(ttlSeconds: number): void {
  if (typeof ttlSeconds !== 'number' || !Number.isInteger(ttlSeconds)) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_TTL,
      'ttlSeconds',
      ttlSeconds,
      'ttlSeconds must be a positive integer representing seconds. Example: 3600 (1 hour)',
    );
  }

  if (ttlSeconds < 0) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_TTL,
      'ttlSeconds',
      ttlSeconds,
      'ttlSeconds cannot be negative. Use 0 for immediate expiration or a positive value.',
    );
  }

  if (ttlSeconds > 365 * 24 * 3600) {
    // More than 1 year
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_TTL,
      'ttlSeconds',
      ttlSeconds,
      'ttlSeconds is unusually large (>1 year). Consider using maxAgeCapDays for long-term caching.',
    );
  }
}

/**
 * Validates max age cap days value.
 */
function validateMaxAgeCapDays(maxAgeCapDays: number): void {
  if (typeof maxAgeCapDays !== 'number' || !Number.isInteger(maxAgeCapDays)) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_MAX_AGE_CAP,
      'maxAgeCapDays',
      maxAgeCapDays,
      'maxAgeCapDays must be a positive integer representing days. Example: 365 (1 year)',
    );
  }

  if (maxAgeCapDays <= 0) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_MAX_AGE_CAP,
      'maxAgeCapDays',
      maxAgeCapDays,
      'maxAgeCapDays must be positive. Use a value like 30, 90, or 365 days.',
    );
  }

  if (maxAgeCapDays > 3650) {
    // More than 10 years
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_MAX_AGE_CAP,
      'maxAgeCapDays',
      maxAgeCapDays,
      'maxAgeCapDays is unusually large (>10 years). Consider if this is intended.',
    );
  }
}

/**
 * Validates aging rules array.
 */
function validateAgingRules(aging: AgingRule[], maxAgeCapDays?: number): void {
  const seenUntilDays = new Set<number>();

  for (let i = 0; i < aging.length; i++) {
    const rule = aging[i];

    // Skip invalid entries
    if (!rule) {
      throw new ISGConfigurationError(
        ISGValidationError.INVALID_AGING_RULE,
        `aging[${i}]`,
        rule,
        `Aging rule at index ${i} is null or undefined.`,
      );
    }

    // Validate individual rule
    validateAgingRule(rule, i);

    // Check for duplicates
    if (seenUntilDays.has(rule.untilDays)) {
      throw new ISGConfigurationError(
        ISGValidationError.DUPLICATE_AGING_RULE,
        `aging[${i}].untilDays`,
        rule.untilDays,
        `Duplicate aging rule for ${rule.untilDays} days. Each untilDays value must be unique.`,
      );
    }
    seenUntilDays.add(rule.untilDays);

    // Check if rule exceeds max age cap
    if (maxAgeCapDays !== undefined && rule.untilDays > maxAgeCapDays) {
      throw new ISGConfigurationError(
        ISGValidationError.AGING_RULE_EXCEEDS_CAP,
        `aging[${i}].untilDays`,
        rule.untilDays,
        `Aging rule for ${rule.untilDays} days exceeds maxAgeCapDays (${maxAgeCapDays}). Rule will never be used.`,
      );
    }
  }

  // Check if rules are sorted by untilDays (ascending)
  const sortedRules = [...aging].sort((a, b) => a.untilDays - b.untilDays);
  for (let i = 0; i < aging.length; i++) {
    if (aging[i]?.untilDays !== sortedRules[i]?.untilDays) {
      throw new ISGConfigurationError(
        ISGValidationError.UNSORTED_AGING_RULES,
        'aging',
        aging.map((r) => r.untilDays),
        'Aging rules must be sorted by untilDays in ascending order. Sort rules from shortest to longest duration.',
      );
    }
  }
}

/**
 * Validates a single aging rule.
 */
function validateAgingRule(rule: AgingRule, index: number): void {
  if (!rule || typeof rule !== 'object') {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_AGING_RULE,
      `aging[${index}]`,
      rule,
      'Aging rule must be an object with untilDays and ttlSeconds properties.',
    );
  }

  // Validate untilDays
  if (
    typeof rule.untilDays !== 'number' ||
    !Number.isInteger(rule.untilDays) ||
    rule.untilDays <= 0
  ) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_AGING_RULE,
      `aging[${index}].untilDays`,
      rule.untilDays,
      'untilDays must be a positive integer representing days. Example: 7, 30, 90',
    );
  }

  // Validate ttlSeconds
  if (
    typeof rule.ttlSeconds !== 'number' ||
    !Number.isInteger(rule.ttlSeconds) ||
    rule.ttlSeconds < 0
  ) {
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_AGING_RULE,
      `aging[${index}].ttlSeconds`,
      rule.ttlSeconds,
      'ttlSeconds must be a non-negative integer representing seconds. Example: 3600 (1 hour)',
    );
  }

  // Warn about unusually long TTL in aging rules
  if (rule.ttlSeconds > 30 * 24 * 3600) {
    // More than 30 days
    throw new ISGConfigurationError(
      ISGValidationError.INVALID_AGING_RULE,
      `aging[${index}].ttlSeconds`,
      rule.ttlSeconds,
      `ttlSeconds in aging rule is unusually large (>30 days). Consider if this is intended for content up to ${rule.untilDays} days old.`,
    );
  }
}

/**
 * Validates front-matter ISG overrides for a single page.
 * Provides helpful error messages for invalid page-level configuration.
 *
 * `loadContent` runs it on each Markdown file as it loads, when ISG is on, so an invalid value
 * stops the build before any page is written. A field without a value (`tags:`, which YAML reads
 * as `null`) counts as not set.
 *
 * @param frontMatter - Page front-matter object
 * @param sourcePath - Path to source file for error context
 * @throws {ISGConfigurationError} When front-matter overrides are invalid
 *
 * @example
 * ```typescript
 * try {
 *   validatePageISGOverrides(page.frontMatter, page.sourcePath);
 * } catch (error) {
 *   console.error(`Error in ${page.sourcePath}: ${error.message}`);
 * }
 * ```
 */
export function validatePageISGOverrides(
  frontMatter: Record<string, unknown>,
  sourcePath: string,
): void {
  // Validate page-level ttlSeconds override
  if (isSet(frontMatter.ttlSeconds)) {
    if (
      typeof frontMatter.ttlSeconds !== 'number' ||
      !Number.isInteger(frontMatter.ttlSeconds) ||
      frontMatter.ttlSeconds < 0
    ) {
      throw new ISGConfigurationError(
        ISGValidationError.INVALID_TTL,
        'ttlSeconds',
        frontMatter.ttlSeconds,
        `Invalid ttlSeconds in front-matter of ${sourcePath}. Must be a non-negative integer.`,
      );
    }
  }

  // Validate page-level maxAgeCapDays override
  if (isSet(frontMatter.maxAgeCapDays)) {
    if (
      typeof frontMatter.maxAgeCapDays !== 'number' ||
      !Number.isInteger(frontMatter.maxAgeCapDays) ||
      frontMatter.maxAgeCapDays <= 0
    ) {
      throw new ISGConfigurationError(
        ISGValidationError.INVALID_MAX_AGE_CAP,
        'maxAgeCapDays',
        frontMatter.maxAgeCapDays,
        `Invalid maxAgeCapDays in front-matter of ${sourcePath}. Must be a positive integer.`,
      );
    }
  }

  // Validate tags array
  if (isSet(frontMatter.tags)) {
    if (!Array.isArray(frontMatter.tags)) {
      throw new ISGConfigurationError(
        ISGValidationError.INVALID_AGING_RULE, // Reusing closest error code
        'tags',
        frontMatter.tags,
        `Invalid tags in front-matter of ${sourcePath}. Must be an array of strings.`,
      );
    }

    // Check that all tags are strings
    frontMatter.tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        throw new ISGConfigurationError(
          ISGValidationError.INVALID_AGING_RULE,
          `tags[${index}]`,
          tag,
          `Invalid tag at index ${index} in front-matter of ${sourcePath}. All tags must be strings.`,
        );
      }
    });
  }
}

/** Whether a front matter field has a value: `null` (a key with nothing after it) has none */
function isSet(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/**
 * A page's `maxAgeCapDays` override: a whole number above 0, the values
 * {@link validatePageISGOverrides} accepts. Any other value is ignored: Markdown files are checked
 * as they load when ISG is on, and with ISG off the cap is not used.
 *
 * @param value - The page's `maxAgeCapDays` front matter
 * @returns The override, or undefined to use `isg.maxAgeCapDays`
 */
export function getMaxAgeCapOverride(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}
