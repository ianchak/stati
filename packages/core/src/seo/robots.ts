/**
 * Robots.txt generation utilities for Stati
 * @module seo/robots
 */

import type { RobotsTxtConfig } from '../types/config.js';
import { isValidUrl, resolveAbsoluteUrl, normalizeUrlPath } from './utils/index.js';

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

  // Generate rules
  effectiveRules.forEach((rule) => {
    lines.push(`User-agent: ${rule.userAgent}`);

    if (rule.allow) {
      rule.allow.forEach((path) => lines.push(`Allow: ${normalizeUrlPath(path)}`));
    }

    if (rule.disallow) {
      rule.disallow.forEach((path) => lines.push(`Disallow: ${normalizeUrlPath(path)}`));
    }

    if (typeof rule.crawlDelay === 'number' && rule.crawlDelay > 0) {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }

    lines.push(''); // Add a blank line after each rule
  });

  // Add sitemaps
  if (sitemaps.length > 0) {
    sitemaps.forEach((sitemap) => {
      // Ensure sitemap URL is absolute
      const sitemapUrl =
        siteUrl && !isValidUrl(sitemap) ? resolveAbsoluteUrl(sitemap, siteUrl) : sitemap;
      lines.push(`Sitemap: ${sitemapUrl}`);
    });
    lines.push(''); // Add a blank line
  }

  // Add custom directives
  if (custom.length > 0) {
    lines.push(...custom, '');
  }

  return lines.join('\n');
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
