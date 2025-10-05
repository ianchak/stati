import { describe, it, expect } from 'vitest';
import {
  generateRobotsTxt,
  generateRobotsTxtFromConfig,
  configToOptions,
} from '../../src/seo/robots.js';
import type { RobotsTxtConfig } from '../../src/types/config.js';

describe('Robots.txt Generator - generateRobotsTxt', () => {
  it('should generate default robots.txt with allow all', () => {
    const result = generateRobotsTxt();
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Allow: /');
  });

  it('should generate robots.txt with custom user agent', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
      ],
    });
    expect(result).toContain('User-agent: Googlebot');
    expect(result).toContain('Allow: /');
  });

  it('should generate multiple user agent rules', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
        {
          userAgent: 'Bingbot',
          disallow: ['/admin/'],
        },
      ],
    });
    expect(result).toContain('User-agent: Googlebot');
    expect(result).toContain('User-agent: Bingbot');
    expect(result).toContain('Disallow: /admin/');
  });

  it('should normalize paths to start with /', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: '*',
          allow: ['public'],
          disallow: ['admin'],
        },
      ],
    });
    expect(result).toContain('Allow: /public');
    expect(result).toContain('Disallow: /admin');
  });

  it('should handle multiple allow paths', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: '*',
          allow: ['/public/', '/assets/', '/images/'],
        },
      ],
    });
    expect(result).toContain('Allow: /public/');
    expect(result).toContain('Allow: /assets/');
    expect(result).toContain('Allow: /images/');
  });

  it('should handle multiple disallow paths', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: '*',
          disallow: ['/admin/', '/api/', '/private/'],
        },
      ],
    });
    expect(result).toContain('Disallow: /admin/');
    expect(result).toContain('Disallow: /api/');
    expect(result).toContain('Disallow: /private/');
  });

  it('should include crawl delay if non-zero', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: '*',
          allow: ['/'],
          crawlDelay: 10,
        },
      ],
    });
    expect(result).toContain('Crawl-delay: 10');
  });

  it('should not include crawl delay if zero', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: '*',
          allow: ['/'],
          crawlDelay: 0,
        },
      ],
    });
    expect(result).not.toContain('Crawl-delay: 0');
  });

  it('should add sitemap URL', () => {
    const result = generateRobotsTxt({
      sitemaps: ['https://example.com/sitemap.xml'],
    });
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should add multiple sitemap URLs', () => {
    const result = generateRobotsTxt({
      sitemaps: ['https://example.com/sitemap.xml', 'https://example.com/sitemap-news.xml'],
    });
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(result).toContain('Sitemap: https://example.com/sitemap-news.xml');
  });

  it('should resolve relative sitemap paths with siteUrl', () => {
    const result = generateRobotsTxt({
      sitemaps: ['/sitemap.xml'],
      siteUrl: 'https://example.com',
    });
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should resolve sitemap path without leading slash', () => {
    const result = generateRobotsTxt({
      sitemaps: ['sitemap.xml'],
      siteUrl: 'https://example.com',
    });
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should handle siteUrl with trailing slash', () => {
    const result = generateRobotsTxt({
      sitemaps: ['/sitemap.xml'],
      siteUrl: 'https://example.com/',
    });
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should keep absolute sitemap URLs unchanged', () => {
    const result = generateRobotsTxt({
      sitemaps: ['https://cdn.example.com/sitemap.xml'],
      siteUrl: 'https://example.com',
    });
    expect(result).toContain('Sitemap: https://cdn.example.com/sitemap.xml');
  });

  it('should add custom directives', () => {
    const result = generateRobotsTxt({
      custom: ['# Custom comment', 'Host: example.com'],
    });
    expect(result).toContain('# Custom comment');
    expect(result).toContain('Host: example.com');
  });

  it('should separate user agent blocks with empty lines', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
        {
          userAgent: 'Bingbot',
          allow: ['/'],
        },
      ],
    });
    const lines = result.split('\n');
    const googlebotIndex = lines.findIndex((l) => l.includes('User-agent: Googlebot'));
    // There should be an empty line after the Googlebot block (Allow: / + empty line)
    expect(lines[googlebotIndex + 2]).toBe('');
  });

  it('should end with newline', () => {
    const result = generateRobotsTxt();
    expect(result.endsWith('\n')).toBe(true);
  });

  it('should handle complete example', () => {
    const result = generateRobotsTxt({
      rules: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
          crawlDelay: 1,
        },
        {
          userAgent: '*',
          disallow: ['/admin/', '/api/'],
        },
      ],
      sitemaps: ['https://example.com/sitemap.xml'],
      custom: ['# Powered by Stati'],
    });

    expect(result).toContain('User-agent: Googlebot');
    expect(result).toContain('Allow: /');
    expect(result).toContain('Crawl-delay: 1');
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Disallow: /admin/');
    expect(result).toContain('Disallow: /api/');
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(result).toContain('# Powered by Stati');
  });
});

describe('Robots.txt Generator - configToOptions', () => {
  it('should convert basic config', () => {
    const config: RobotsTxtConfig = {
      allow: ['/'],
    };
    const options = configToOptions(config);
    expect(options.rules).toBeDefined();
    expect(options.rules).toHaveLength(1);
    const rule = options.rules![0];
    expect(rule).toBeDefined();
    expect(rule!.userAgent).toBe('*');
    expect(rule!.allow).toEqual(['/']);
  });

  it('should convert disallow config', () => {
    const config: RobotsTxtConfig = {
      disallow: ['/admin/', '/api/'],
    };
    const options = configToOptions(config);
    expect(options.rules).toBeDefined();
    expect(options.rules).toHaveLength(1);
    const rule = options.rules![0];
    expect(rule).toBeDefined();
    expect(rule!.disallow).toEqual(['/admin/', '/api/']);
  });

  it('should convert crawl delay config', () => {
    const config: RobotsTxtConfig = {
      allow: ['/'],
      crawlDelay: 5,
    };
    const options = configToOptions(config);
    expect(options.rules).toBeDefined();
    expect(options.rules).toHaveLength(1);
    const rule = options.rules![0];
    expect(rule).toBeDefined();
    expect(rule!.crawlDelay).toBe(5);
  });

  it('should convert user agents config', () => {
    const config: RobotsTxtConfig = {
      userAgents: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
        {
          userAgent: 'Bingbot',
          disallow: ['/private/'],
        },
      ],
    };
    const options = configToOptions(config);
    expect(options.rules).toBeDefined();
    expect(options.rules).toHaveLength(2);
    const rule0 = options.rules![0];
    const rule1 = options.rules![1];
    expect(rule0).toBeDefined();
    expect(rule1).toBeDefined();
    expect(rule0!.userAgent).toBe('Googlebot');
    expect(rule1!.userAgent).toBe('Bingbot');
  });

  it('should combine user agents and global rules', () => {
    const config: RobotsTxtConfig = {
      userAgents: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
      ],
      disallow: ['/admin/'],
    };
    const options = configToOptions(config);
    expect(options.rules).toBeDefined();
    expect(options.rules).toHaveLength(2);
    const rule0 = options.rules![0];
    const rule1 = options.rules![1];
    expect(rule0).toBeDefined();
    expect(rule1).toBeDefined();
    expect(rule0!.userAgent).toBe('Googlebot');
    expect(rule1!.userAgent).toBe('*');
    expect(rule1!.disallow).toEqual(['/admin/']);
  });

  it('should handle sitemap boolean true', () => {
    const config: RobotsTxtConfig = {
      sitemap: true,
    };
    const options = configToOptions(config);
    expect(options.sitemaps).toEqual(['/sitemap.xml']);
  });

  it('should handle sitemap string', () => {
    const config: RobotsTxtConfig = {
      sitemap: 'https://example.com/custom-sitemap.xml',
    };
    const options = configToOptions(config);
    expect(options.sitemaps).toEqual(['https://example.com/custom-sitemap.xml']);
  });

  it('should handle sitemap false', () => {
    const config: RobotsTxtConfig = {
      sitemap: false,
    };
    const options = configToOptions(config);
    expect(options.sitemaps).toBeUndefined();
  });

  it('should handle custom lines', () => {
    const config: RobotsTxtConfig = {
      customLines: ['# Custom directive', 'Host: example.com'],
    };
    const options = configToOptions(config);
    expect(options.custom).toEqual(['# Custom directive', 'Host: example.com']);
  });

  it('should include siteUrl when provided', () => {
    const config: RobotsTxtConfig = {
      sitemap: true,
    };
    const options = configToOptions(config, 'https://example.com');
    expect(options.siteUrl).toBe('https://example.com');
  });

  it('should handle empty config', () => {
    const config: RobotsTxtConfig = {};
    const options = configToOptions(config);
    expect(options.rules).toBeUndefined();
    expect(options.sitemaps).toBeUndefined();
    expect(options.custom).toBeUndefined();
  });
});

describe('Robots.txt Generator - generateRobotsTxtFromConfig', () => {
  it('should generate robots.txt from basic config', () => {
    const config: RobotsTxtConfig = {
      allow: ['/'],
    };
    const result = generateRobotsTxtFromConfig(config);
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Allow: /');
  });

  it('should generate robots.txt with sitemap', () => {
    const config: RobotsTxtConfig = {
      allow: ['/'],
      sitemap: true,
    };
    const result = generateRobotsTxtFromConfig(config, 'https://example.com');
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('should generate robots.txt with user agents', () => {
    const config: RobotsTxtConfig = {
      userAgents: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
          disallow: ['/admin/'],
        },
      ],
    };
    const result = generateRobotsTxtFromConfig(config);
    expect(result).toContain('User-agent: Googlebot');
    expect(result).toContain('Allow: /');
    expect(result).toContain('Disallow: /admin/');
  });

  it('should generate complete robots.txt', () => {
    const config: RobotsTxtConfig = {
      userAgents: [
        {
          userAgent: 'Googlebot',
          allow: ['/'],
        },
      ],
      disallow: ['/admin/'],
      crawlDelay: 2,
      sitemap: 'https://example.com/sitemap.xml',
      customLines: ['# Generated by Stati'],
    };
    const result = generateRobotsTxtFromConfig(config, 'https://example.com');

    expect(result).toContain('User-agent: Googlebot');
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Disallow: /admin/');
    expect(result).toContain('Crawl-delay: 2');
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(result).toContain('# Generated by Stati');
  });

  it('should handle empty config', () => {
    const config: RobotsTxtConfig = {};
    const result = generateRobotsTxtFromConfig(config);
    // Should generate default robots.txt
    expect(result).toContain('User-agent: *');
    expect(result).toContain('Allow: /');
  });
});
