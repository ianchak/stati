import { describe, it, expect } from 'vitest';
import { defineConfig } from '../index.js';
import type { StatiConfig } from '../types.js';

describe('defineConfig', () => {
  it('should return the same config object passed to it', () => {
    const config: StatiConfig = {
      site: {
        title: 'Test Site',
        baseUrl: 'https://test.com',
      },
      srcDir: 'content',
      outDir: 'build',
      isg: {
        enabled: true,
        ttlSeconds: 3600,
      },
    };

    const result = defineConfig(config);
    expect(result).toBe(config);
    expect(result).toEqual(config);
  });

  it('should provide proper TypeScript typing', () => {
    // This test verifies that TypeScript IntelliSense works correctly
    const config = defineConfig({
      site: {
        title: 'My Site',
        baseUrl: 'https://example.com',
      },
      srcDir: 'site',
      outDir: 'dist',
      staticDir: 'public',
      markdown: {
        configure: (md) => {
          md.set({ html: true });
        },
      },
      eta: {
        filters: {
          uppercase: (str: unknown) => String(str).toUpperCase(),
        },
      },
      isg: {
        enabled: true,
        ttlSeconds: 1800,
        maxAgeCapDays: 90,
        aging: [
          { untilDays: 7, ttlSeconds: 86400 },
          { untilDays: 30, ttlSeconds: 604800 },
        ],
      },
      hooks: {
        beforeAll: async (ctx) => {
          // eslint-disable-next-line no-console
          console.log(`Building ${ctx.pages.length} pages`);
        },
        afterAll: async (ctx) => {
          // eslint-disable-next-line no-console
          console.log(`Build complete for ${ctx.pages.length} pages`);
        },
      },
    });

    expect(config.site.title).toBe('My Site');
    expect(config.srcDir).toBe('site');
    expect(config.isg?.enabled).toBe(true);
    expect(config.hooks?.beforeAll).toBeDefined();
  });

  it('should handle minimal configuration', () => {
    const minimalConfig = defineConfig({
      site: {
        title: 'Minimal Site',
        baseUrl: 'https://minimal.com',
      },
    });

    expect(minimalConfig.site.title).toBe('Minimal Site');
    expect(minimalConfig.site.baseUrl).toBe('https://minimal.com');
  });

  it('should handle configuration with custom filters', () => {
    const config = defineConfig({
      site: {
        title: 'Filter Test',
        baseUrl: 'https://test.com',
      },
      eta: {
        filters: {
          formatDate: (date: unknown) => {
            if (date instanceof Date) {
              return date.toLocaleDateString();
            }
            return String(date);
          },
          truncate: (str: unknown) => {
            const text = String(str);
            const maxLength = 100; // Fixed length for simplicity
            return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
          },
        },
      },
    });

    expect(config.eta?.filters?.formatDate).toBeDefined();
    expect(config.eta?.filters?.truncate).toBeDefined();
  });
});
