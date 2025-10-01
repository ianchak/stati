import { describe, it, expect } from 'vitest';
import { createValidatingPartialsProxy } from '../../src/core/utils/partial-validation.js';

describe('Partial Validation', () => {
  describe('createValidatingPartialsProxy', () => {
    it('should show helpful message when no partials exist', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = {};
        const proxy = createValidatingPartialsProxy(partials);

        expect(() => {
          return (proxy as Record<string, string>).anything;
        }).toThrow(/No partials are available/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should return partials normally in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const partials = { hero: '<h1>Hero</h1>', footer: '<footer>Footer</footer>' };
        const proxy = createValidatingPartialsProxy(partials);

        expect(proxy).toBe(partials); // Should return original object in production
        expect(proxy.hero).toBe('<h1>Hero</h1>');
        expect((proxy as Record<string, string>).nonexistent).toBeUndefined(); // Should not throw in production
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should return error overlay HTML for non-existent partials in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = { hero: '<h1>Hero</h1>', footer: '<footer>Footer</footer>' };
        const proxy = createValidatingPartialsProxy(partials);

        const result = (proxy as Record<string, string>).nonexistent;
        expect(result).toContain('Stati Development Error Overlay');
        expect(result).toContain('Partial "nonexistent" not found');
        expect(result).toContain('position: fixed');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should suggest similar partial names when typo is detected', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = {
          hero: '<h1>Hero</h1>',
          header: '<header>Header</header>',
          footer: '<footer>Footer</footer>',
        };
        const proxy = createValidatingPartialsProxy(partials);

        const herResult = (proxy as Record<string, string>).her; // Typo: should suggest "hero"
        expect(herResult).toContain('Did you mean');
        expect(herResult).toContain('"hero"');

        const headResult = (proxy as Record<string, string>).head; // Typo: should suggest "header"
        expect(headResult).toContain('Did you mean');
        expect(headResult).toContain('"header"');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should show error overlay when no good suggestions exist', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = { hero: '<h1>Hero</h1>', footer: '<footer>Footer</footer>' };
        const proxy = createValidatingPartialsProxy(partials);

        const result = (proxy as Record<string, string>).xyz; // No similar names
        expect(result).toContain('Partial "xyz" not found');
        expect(result).toContain('No similar partials found');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle empty partials object', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = {};
        const proxy = createValidatingPartialsProxy(partials);

        expect(() => {
          return (proxy as Record<string, string>).anything;
        }).toThrow(/No partials are available/);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should allow normal object operations', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = { hero: '<h1>Hero</h1>', footer: '<footer>Footer</footer>' };
        const proxy = createValidatingPartialsProxy(partials);

        expect('hero' in proxy).toBe(true);
        expect('nonexistent' in proxy).toBe(false);
        expect(Object.keys(proxy)).toEqual(['hero', 'footer']);
        expect(proxy.hero).toBe('<h1>Hero</h1>');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should handle prototype methods correctly', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const partials = { hero: '<h1>Hero</h1>' };
        const proxy = createValidatingPartialsProxy(partials);

        // Should not throw for legitimate object methods
        expect(proxy.toString).toBeDefined();
        expect(typeof proxy.hasOwnProperty).toBe('function');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
