import { describe, it, expect } from 'vitest';
import { setupTailwind } from '../src/tailwind-processor.js';
import { DEPENDENCY_VERSIONS } from '../src/constants.js';

describe('tailwind-processor', () => {
  describe('setupTailwind', () => {
    it('should return a ProcessorResult with files, devDependencies, and scripts', () => {
      const result = setupTailwind();

      expect(result.files).toBeInstanceOf(Map);
      expect(typeof result.devDependencies).toBe('object');
      expect(typeof result.scripts).toBe('object');
    });

    it('should include tailwind.config.js in files', () => {
      const result = setupTailwind();

      expect(result.files.has('tailwind.config.js')).toBe(true);

      const configContent = result.files.get('tailwind.config.js');
      expect(configContent).toContain('module.exports');
      expect(configContent).toContain('./site/**/*.{md,eta,html}');
      expect(configContent).toContain('./.stati/tailwind-classes.html');
      expect(configContent).toContain('theme:');
      expect(configContent).toContain('plugins:');
    });

    it('should include src/styles.css with Tailwind directives in files', () => {
      const result = setupTailwind();

      expect(result.files.has('src/styles.css')).toBe(true);

      const cssContent = result.files.get('src/styles.css');
      expect(cssContent).toContain('@tailwind base;');
      expect(cssContent).toContain('@tailwind components;');
      expect(cssContent).toContain('@tailwind utilities;');
      expect(cssContent).toContain('@layer components');
      expect(cssContent).toContain('.logo');
      expect(cssContent).toContain('.skip-link');
    });

    it('should include correct devDependencies', () => {
      const result = setupTailwind();

      expect(result.devDependencies).toEqual({
        tailwindcss: DEPENDENCY_VERSIONS.tailwindcss,
        autoprefixer: DEPENDENCY_VERSIONS.autoprefixer,
        postcss: DEPENDENCY_VERSIONS.postcss,
      });
    });

    it('should include correct scripts', () => {
      const result = setupTailwind();

      expect(result.scripts['build:css']).toBe(
        'tailwindcss -i src/styles.css -o dist/styles.css --minify',
      );
      expect(result.scripts.build).toBe('stati build && npm run build:css');
      expect(result.scripts.dev).toBe(
        'stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css',
      );
    });

    it('should not include watch:css or copy:css script (uses Stati built-in Tailwind support)', () => {
      const result = setupTailwind();

      expect(result.scripts).not.toHaveProperty('watch:css');
      expect(result.scripts).not.toHaveProperty('copy:css');
    });

    it('should return the same result when called multiple times', () => {
      const result1 = setupTailwind();
      const result2 = setupTailwind();

      expect(result1.files.size).toBe(result2.files.size);
      expect(result1.devDependencies).toEqual(result2.devDependencies);
      expect(result1.scripts).toEqual(result2.scripts);
    });
  });
});
