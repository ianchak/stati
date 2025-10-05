/**
 * Robots.txt generation utilities for Stati
 * @module seo/robots
 */

import type { RobotsTxtConfig } from '../types/config.js';
import { isValidUrl, normalizeUrlPath, resolveAbsoluteUrl } from './utils/index.js';

/**
 * User agent rule entry for robots.txt
 */
export interface UserAgentRule {
  /** User agent name (e.g., 'Googlebot', '*') */
  userAgent: string;
  /** Paths to allow */
  allow?: string[];
  /** Paths to disallow */
  disallow?: string[];
  /** Crawl delay in seconds */
  crawlDelay?: number;
}

/**
 * Options for generating robots.txt content
 */
export interface RobotsTxtOptions {
  /** User agent rules */
  rules?: UserAgentRule[];
  /** Sitemap URLs to include */
  sitemaps?: string[];
  /** Additional custom directives */
  custom?: string[];
  /** Site base URL for resolving sitemap paths */
  siteUrl?: string;
}

/**
 * Default robots.txt configuration (allow all)
 */
const DEFAULT_ROBOTS_CONFIG: RobotsTxtOptions = {
  rules: [
    {
      userAgent: '*',
      allow: ['/'],
    },
  ],
};

/**
 * Resolves a sitemap path to absolute URL
 * @param sitemap - Sitemap path or URL
 * @param siteUrl - Base site URL
 * @returns Absolute sitemap URL or original path
 */
function resolveSitemapUrl(sitemap: string, siteUrl?: string): string {
  // Already absolute URL
  if (isValidUrl(sitemap)) {
    return sitemap;
  }

  // Relative path with siteUrl
  if (siteUrl) {
    return resolveAbsoluteUrl(sitemap, siteUrl);
  }

  // Return normalized path
  return normalizeUrlPath(sitemap);
}

/**
 * Generates robots.txt content from options
 * @param options - Robots.txt generation options
 * @returns Generated robots.txt content
 *
 * @example
 * ```typescript
 * const content = generateRobotsTxt({
 *   rules: [
 *     {
 *       userAgent: 'Googlebot',
 *       allow: ['/'],
 *       crawlDelay: 1
 *     },
 *     {
 *       userAgent: '*',
 *       disallow: ['/admin/', '/api/']
 *     }
 *   ],
 *   sitemaps: ['https://example.com/sitemap.xml'],
 *   custom: ['# Custom comment']
 * });
 * ```
 */
export function generateRobotsTxt(options: RobotsTxtOptions = {}): string {
  const lines: string[] = [];
  const { rules = [], sitemaps = [], custom = [], siteUrl } = options;

  // Use default rules if none provided
  const effectiveRules = rules.length > 0 ? rules : (DEFAULT_ROBOTS_CONFIG.rules ?? []);

  // Generate user agent rules
  for (const rule of effectiveRules) {
    lines.push(`User-agent: ${rule.userAgent}`);

    // Allow rules
    if (rule.allow && rule.allow.length > 0) {
      for (const path of rule.allow) {
        lines.push(`Allow: ${normalizeUrlPath(path)}`);
      }
    }

    // Disallow rules
    if (rule.disallow && rule.disallow.length > 0) {
      for (const path of rule.disallow) {
        lines.push(`Disallow: ${normalizeUrlPath(path)}`);
      }
    }

    // Crawl delay
    if (rule.crawlDelay !== undefined) {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }

    // Empty line between user agent blocks
    lines.push('');
  }

  // Add sitemap URLs
  for (const sitemap of sitemaps) {
    const sitemapUrl = resolveSitemapUrl(sitemap, siteUrl);
    lines.push(`Sitemap: ${sitemapUrl}`);
  }

  // Add empty line if sitemaps were added
  if (sitemaps.length > 0) {
    lines.push('');
  }

  // Add custom directives
  for (const directive of custom) {
    lines.push(directive);
  }

  // Add final empty line if custom directives were added
  if (custom.length > 0) {
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Converts Stati RobotsTxtConfig to RobotsTxtOptions
 * @param config - Stati robots.txt configuration
 * @param siteUrl - Site base URL
 * @returns Robots.txt generation options
 */
export function configToOptions(config: RobotsTxtConfig, siteUrl?: string): RobotsTxtOptions {
  const options: RobotsTxtOptions = {};

  // Add siteUrl if provided
  if (siteUrl !== undefined) {
    options.siteUrl = siteUrl;
  }

  const rules: UserAgentRule[] = [];

  // Convert user agent specific rules
  if (config.userAgents && config.userAgents.length > 0) {
    for (const ua of config.userAgents) {
      const rule: UserAgentRule = {
        userAgent: ua.userAgent,
      };
      if (ua.allow !== undefined) {
        rule.allow = ua.allow;
      }
      if (ua.disallow !== undefined) {
        rule.disallow = ua.disallow;
      }
      rules.push(rule);
    }
  }

  // Add global rules as wildcard user agent
  if (config.allow || config.disallow || config.crawlDelay !== undefined) {
    const rule: UserAgentRule = {
      userAgent: '*',
    };
    if (config.allow !== undefined) {
      rule.allow = config.allow;
    }
    if (config.disallow !== undefined) {
      rule.disallow = config.disallow;
    }
    if (config.crawlDelay !== undefined) {
      rule.crawlDelay = config.crawlDelay;
    }
    rules.push(rule);
  }

  if (rules.length > 0) {
    options.rules = rules;
  }

  // Handle sitemap configuration
  const sitemaps: string[] = [];
  if (config.sitemap) {
    if (typeof config.sitemap === 'string') {
      // Explicit sitemap URL
      sitemaps.push(config.sitemap);
    } else if (config.sitemap === true) {
      // Auto-include sitemap.xml
      sitemaps.push('/sitemap.xml');
    }
  }

  if (sitemaps.length > 0) {
    options.sitemaps = sitemaps;
  }

  // Add custom directives
  if (config.customLines && config.customLines.length > 0) {
    options.custom = config.customLines;
  }

  return options;
}

/**
 * Generates robots.txt content from Stati configuration
 * @param config - Stati robots.txt configuration
 * @param siteUrl - Site base URL for resolving sitemap paths
 * @returns Generated robots.txt content
 *
 * @example
 * ```typescript
 * const content = generateRobotsTxtFromConfig(
 *   {
 *     rules: [
 *       { userAgent: '*', allow: ['/'] }
 *     ],
 *     sitemaps: ['/sitemap.xml']
 *   },
 *   'https://example.com'
 * );
 * ```
 */
export function generateRobotsTxtFromConfig(config: RobotsTxtConfig, siteUrl?: string): string {
  const options = configToOptions(config, siteUrl);
  return generateRobotsTxt(options);
}
