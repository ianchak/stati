/**
 * RSS validation tests
 */

import { describe, it, expect } from 'vitest';
import { validateRSSConfig, validateRSSFeedConfig } from '../../src/rss/validation.js';
import type { RSSConfig, RSSFeedConfig } from '../../src/types/rss.js';

describe('RSS Validation', () => {
  describe('validateRSSFeedConfig', () => {
    it('should validate a valid feed configuration', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should require filename', () => {
      const feedConfig = {
        title: 'Test Feed',
        description: 'A test feed',
      } as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'filename' is required");
    });

    it('should require title', () => {
      const feedConfig = {
        filename: 'feed.xml',
        description: 'A test feed',
      } as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'title' is required and cannot be empty");
    });

    it('should require description', () => {
      const feedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
      } as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'description' is required and cannot be empty");
    });

    it('should validate email format for managingEditor', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        managingEditor: 'invalid-email',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true); // Only warnings, not errors
      expect(result.warnings).toContain(
        "Feed 0: managingEditor should start with a valid email address (format: 'email@example.com (Name)')",
      );
    });

    it('should accept valid email for managingEditor', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        managingEditor: 'editor@example.com',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email format for webMaster', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        webMaster: 'not-an-email',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true); // Only warnings, not errors
      expect(result.warnings).toContain(
        "Feed 0: webMaster should start with a valid email address (format: 'email@example.com (Name)')",
      );
    });

    it('should validate TTL is positive', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        ttl: -1,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'ttl' must be a non-negative number");
    });

    it('should accept valid TTL', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        ttl: 60,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about image dimensions exceeding RSS 2.0 limits', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        image: {
          url: 'https://example.com/logo.png',
          title: 'Logo',
          link: 'https://example.com',
          width: 200,
          height: 500,
        },
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Feed 0: image width 200 exceeds recommended maximum of 144 pixels',
      );
      expect(result.warnings).toContain(
        'Feed 0: image height 500 exceeds recommended maximum of 400 pixels',
      );
    });

    it('should accept image dimensions within RSS 2.0 limits', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        image: {
          url: 'https://example.com/logo.png',
          title: 'Logo',
          link: 'https://example.com',
          width: 144,
          height: 400,
        },
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const feedConfig = {
        filename: '',
        title: '',
        description: '',
        managingEditor: 'invalid',
        ttl: -5,
      } as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateRSSConfig', () => {
    it('should validate a valid RSS configuration', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [
          {
            filename: 'feed.xml',
            title: 'Main Feed',
            description: 'Main site feed',
          },
        ],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should require feeds array when enabled', () => {
      const config = {
        enabled: true,
      } as RSSConfig;

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'At least one feed configuration is required when RSS is enabled',
      );
    });

    it('should require at least one feed when enabled', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'At least one feed configuration is required when RSS is enabled',
      );
    });

    it('should detect duplicate filenames', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [
          {
            filename: 'feed.xml',
            title: 'Feed 1',
            description: 'First feed',
          },
          {
            filename: 'feed.xml',
            title: 'Feed 2',
            description: 'Second feed',
          },
        ],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Duplicate filename 'feed.xml' found in feed 1");
    });

    it('should validate all feeds and collect errors', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [
          {
            filename: '',
            title: 'Valid Feed',
            description: 'Valid',
          },
          {
            filename: 'feed2.xml',
            title: '',
            description: 'Valid',
            managingEditor: 'invalid-email',
          },
        ],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'filename' is required");
      expect(result.errors).toContain("Feed 1: 'title' is required and cannot be empty");
      expect(result.warnings).toContain(
        "Feed 1: managingEditor should start with a valid email address (format: 'email@example.com (Name)')",
      );
    });

    it('should collect warnings from all feeds', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [
          {
            filename: 'feed1.xml',
            title: 'Feed 1',
            description: 'First feed',
            image: {
              url: 'https://example.com/logo1.png',
              title: 'Logo',
              link: 'https://example.com',
              width: 200,
              height: 400,
            },
          },
          {
            filename: 'feed2.xml',
            title: 'Feed 2',
            description: 'Second feed',
            image: {
              url: 'https://example.com/logo2.png',
              title: 'Logo',
              link: 'https://example.com',
              width: 144,
              height: 500,
            },
          },
        ],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Feed 0: image width 200 exceeds recommended maximum of 144 pixels',
      );
      expect(result.warnings).toContain(
        'Feed 1: image height 500 exceeds recommended maximum of 400 pixels',
      );
    });

    it('should pass validation when RSS is disabled', () => {
      const config: RSSConfig = {
        enabled: false,
        feeds: [],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple feeds with mixed validity', () => {
      const config: RSSConfig = {
        enabled: true,
        feeds: [
          {
            filename: 'valid.xml',
            title: 'Valid Feed',
            description: 'A valid feed',
          },
          {
            filename: '',
            title: 'Invalid Feed',
            description: 'Missing filename',
          },
          {
            filename: 'another-valid.xml',
            title: 'Another Valid',
            description: 'Also valid',
          },
        ],
      };

      const result = validateRSSConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 1: 'filename' is required");
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Edge Cases and Additional Validation', () => {
    it('should handle undefined RSS config', () => {
      const result = validateRSSConfig(undefined);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('RSS configuration is not defined');
    });

    it('should validate empty title string', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: '   ', // Empty after trim
        description: 'A test feed',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'title' is required and cannot be empty");
    });

    it('should validate empty description string', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: '   ', // Empty after trim
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'description' is required and cannot be empty");
    });

    it('should warn about zero TTL', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        ttl: 0,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Feed 0: ttl is 0, which means feed should not be cached');
    });

    it('should validate maxItems is positive', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        maxItems: 0,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'maxItems' must be a positive number");
    });

    it('should validate maxItems is a number', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        maxItems: -5,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'maxItems' must be a positive number");
    });

    it('should require sortFn when sortBy is custom', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        sortBy: 'custom',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 0: 'sortFn' is required when sortBy is 'custom'");
    });

    it('should validate sortBy is a valid option', () => {
      const feedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        sortBy: 'invalid-sort',
      } as unknown as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Feed 0: 'sortBy' must be one of: date-desc, date-asc, title-asc, title-desc, custom",
      );
    });

    it('should require image fields when image is specified', () => {
      const feedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        image: {
          url: '',
          title: '',
          link: '',
        },
      } as unknown as RSSFeedConfig;

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Feed 0: image.url is required when image is specified');
      expect(result.errors).toContain('Feed 0: image.title is required when image is specified');
      expect(result.errors).toContain('Feed 0: image.link is required when image is specified');
    });

    it('should accept valid email with name for managingEditor', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        managingEditor: 'editor@example.com (John Doe)',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept valid email with name for webMaster', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        webMaster: 'webmaster@example.com (Jane Doe)',
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about empty contentPatterns array', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        contentPatterns: [],
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Feed 0: contentPatterns is empty - feed may not include any content',
      );
    });

    it('should pass validation with valid ttl value', () => {
      const feedConfig: RSSFeedConfig = {
        filename: 'feed.xml',
        title: 'Test Feed',
        description: 'A test feed',
        ttl: 60,
      };

      const result = validateRSSFeedConfig(feedConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should use feed index in error messages', () => {
      const feedConfig: RSSFeedConfig = {
        filename: '',
        title: 'Test',
        description: 'Test',
      };

      const result = validateRSSFeedConfig(feedConfig, 5);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Feed 5: 'filename' is required");
    });
  });
});
