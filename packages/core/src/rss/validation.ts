/**
 * RSS feed validation utilities
 * @module rss/validation
 */

import type { RSSFeedConfig, RSSConfig } from '../types/rss.js';

/**
 * Validation result for RSS configuration
 */
export interface RSSValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: string[];
  /** Array of validation warnings (non-critical issues) */
  warnings: string[];
}

/**
 * Validates a single RSS feed configuration
 * @param feedConfig - Feed configuration to validate
 * @param feedIndex - Index of feed in config array (for error messages)
 * @returns Validation result
 */
export function validateRSSFeedConfig(
  feedConfig: RSSFeedConfig,
  feedIndex = 0,
): RSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!feedConfig.filename) {
    errors.push(`Feed ${feedIndex}: 'filename' is required`);
  } else if (!feedConfig.filename.endsWith('.xml')) {
    warnings.push(`Feed ${feedIndex}: filename '${feedConfig.filename}' should end with .xml`);
  }

  if (!feedConfig.title || feedConfig.title.trim() === '') {
    errors.push(`Feed ${feedIndex}: 'title' is required and cannot be empty`);
  }

  if (!feedConfig.description || feedConfig.description.trim() === '') {
    errors.push(`Feed ${feedIndex}: 'description' is required and cannot be empty`);
  }

  // Validate optional fields
  if (feedConfig.ttl !== undefined) {
    if (typeof feedConfig.ttl !== 'number' || feedConfig.ttl < 0) {
      errors.push(`Feed ${feedIndex}: 'ttl' must be a non-negative number`);
    } else if (feedConfig.ttl === 0) {
      warnings.push(`Feed ${feedIndex}: ttl is 0, which means feed should not be cached`);
    }
  }

  if (feedConfig.maxItems !== undefined) {
    if (typeof feedConfig.maxItems !== 'number' || feedConfig.maxItems < 1) {
      errors.push(`Feed ${feedIndex}: 'maxItems' must be a positive number`);
    }
  }

  // Validate sort configuration
  if (feedConfig.sortBy === 'custom' && !feedConfig.sortFn) {
    errors.push(`Feed ${feedIndex}: 'sortFn' is required when sortBy is 'custom'`);
  }

  const validSortOptions = ['date-desc', 'date-asc', 'title-asc', 'title-desc', 'custom'];
  if (feedConfig.sortBy && !validSortOptions.includes(feedConfig.sortBy)) {
    errors.push(`Feed ${feedIndex}: 'sortBy' must be one of: ${validSortOptions.join(', ')}`);
  }

  // Validate image configuration
  if (feedConfig.image) {
    if (!feedConfig.image.url) {
      errors.push(`Feed ${feedIndex}: image.url is required when image is specified`);
    }
    if (!feedConfig.image.title) {
      errors.push(`Feed ${feedIndex}: image.title is required when image is specified`);
    }
    if (!feedConfig.image.link) {
      errors.push(`Feed ${feedIndex}: image.link is required when image is specified`);
    }
    if (feedConfig.image.width !== undefined && feedConfig.image.width > 144) {
      warnings.push(
        `Feed ${feedIndex}: image width ${feedConfig.image.width} exceeds recommended maximum of 144 pixels`,
      );
    }
    if (feedConfig.image.height !== undefined && feedConfig.image.height > 400) {
      warnings.push(
        `Feed ${feedIndex}: image height ${feedConfig.image.height} exceeds recommended maximum of 400 pixels`,
      );
    }
  }

  // Validate email formats
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+/;
  if (feedConfig.managingEditor && !emailPattern.test(feedConfig.managingEditor)) {
    warnings.push(
      `Feed ${feedIndex}: managingEditor should start with a valid email address (format: 'email@example.com (Name)')`,
    );
  }
  if (feedConfig.webMaster && !emailPattern.test(feedConfig.webMaster)) {
    warnings.push(
      `Feed ${feedIndex}: webMaster should start with a valid email address (format: 'email@example.com (Name)')`,
    );
  }

  // Validate patterns
  if (feedConfig.contentPatterns && feedConfig.contentPatterns.length === 0) {
    warnings.push(`Feed ${feedIndex}: contentPatterns is empty - feed may not include any content`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates RSS configuration
 * @param rssConfig - RSS configuration to validate
 * @returns Validation result
 */
export function validateRSSConfig(rssConfig: RSSConfig | undefined): RSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rssConfig) {
    return { valid: true, errors: [], warnings: ['RSS configuration is not defined'] };
  }

  if (!rssConfig.enabled) {
    return { valid: true, errors: [], warnings: ['RSS feed generation is disabled'] };
  }

  if (!rssConfig.feeds || rssConfig.feeds.length === 0) {
    errors.push('At least one feed configuration is required when RSS is enabled');
    return { valid: false, errors, warnings };
  }

  // Validate each feed
  const feedFilenames = new Set<string>();
  rssConfig.feeds.forEach((feedConfig, index) => {
    const result = validateRSSFeedConfig(feedConfig, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);

    // Check for duplicate filenames
    if (feedConfig.filename) {
      if (feedFilenames.has(feedConfig.filename)) {
        errors.push(`Duplicate filename '${feedConfig.filename}' found in feed ${index}`);
      } else {
        feedFilenames.add(feedConfig.filename);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
