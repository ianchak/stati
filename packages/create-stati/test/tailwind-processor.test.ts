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

    it('should configure Tailwind CSS 4 in the stylesheet, without tailwind.config.js', () => {
      const result = setupTailwind();

      expect(result.files.has('tailwind.config.js')).toBe(false);
      expect([...result.files.keys()]).toEqual(['src/styles.css']);
    });

    it('should include src/styles.css with the Tailwind import in files', () => {
      const result = setupTailwind();

      expect(result.files.has('src/styles.css')).toBe(true);

      const cssContent = result.files.get('src/styles.css');
      expect(cssContent).toMatch(/^@import 'tailwindcss';\n/);
      expect(cssContent).not.toContain('@tailwind');
      expect(cssContent).toContain('@layer components');
      expect(cssContent).toContain('.logo');
      expect(cssContent).toContain('.skip-link');
    });

    it("should scan Stati's class inventory, which is in a gitignored folder", () => {
      const cssContent = setupTailwind().files.get('src/styles.css');

      // Relative to src/styles.css
      expect(cssContent).toContain("@source '../.stati/tailwind-classes.html';");
    });

    it('should include correct devDependencies', () => {
      const result = setupTailwind();

      expect(result.devDependencies).toEqual({
        tailwindcss: DEPENDENCY_VERSIONS.tailwindcss,
        '@tailwindcss/cli': DEPENDENCY_VERSIONS['@tailwindcss/cli'],
      });
      expect(DEPENDENCY_VERSIONS.tailwindcss).toMatch(/^\^4\./);
      expect(DEPENDENCY_VERSIONS['@tailwindcss/cli']).toBe(DEPENDENCY_VERSIONS.tailwindcss);
    });

    it('should include correct scripts', () => {
      const result = setupTailwind();

      expect(result.scripts).toEqual({
        build: 'stati build --tailwind-input src/styles.css --tailwind-output dist/styles.css',
        dev: 'stati dev --tailwind-input src/styles.css --tailwind-output dist/styles.css',
      });
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

    it('should carry a template stylesheet over in the components layer', () => {
      const templateCSS = ':root {\n  --accent: #0f7b6c;\n}\n\na {\n  color: var(--accent);\n}\n';
      const result = setupTailwind(templateCSS);

      const cssContent = result.files.get('src/styles.css');
      expect(cssContent).toMatch(/^@import 'tailwindcss';\n/);
      expect(cssContent).toContain("@source '../.stati/tailwind-classes.html';");
      // Above Tailwind's preflight, below its utilities
      expect(cssContent).toContain(
        '@layer components {\n  :root {\n    --accent: #0f7b6c;\n  }\n\n  a {\n    color: var(--accent);\n  }\n}\n',
      );
      expect(cssContent).not.toContain('.skip-link');
      expect(result.filesToDelete).toEqual(['public/styles.css']);
    });

    it('should remove the template stylesheet with starter styles too', () => {
      // A copy in public/ would be written over Tailwind's output by every build
      expect(setupTailwind().filesToDelete).toEqual(['public/styles.css']);
    });
  });
});
