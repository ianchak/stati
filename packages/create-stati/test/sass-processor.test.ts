import { describe, it, expect } from 'vitest';
import { setupSass } from '../src/sass-processor.js';
import { DEPENDENCY_VERSIONS } from '../src/constants.js';

describe('sass-processor', () => {
  describe('setupSass', () => {
    const sampleCSS = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #007bff;
  background: #6c757d;
}

@media (min-width: 768px) {
  body { padding: 20px; }
}`;

    it('should return a ProcessorResultWithDeletions with files, devDependencies, scripts, and filesToDelete', () => {
      const result = setupSass(sampleCSS);

      expect(result.files).toBeInstanceOf(Map);
      expect(typeof result.devDependencies).toBe('object');
      expect(typeof result.scripts).toBe('object');
      expect(Array.isArray(result.filesToDelete)).toBe(true);
    });

    it('should include src/styles.scss in files', () => {
      const result = setupSass(sampleCSS);

      expect(result.files.has('src/styles.scss')).toBe(true);
    });

    it('should convert CSS to SCSS with variables', () => {
      const result = setupSass(sampleCSS);
      const scssContent = result.files.get('src/styles.scss');

      // Should have variable declarations
      expect(scssContent).toContain('$primary-color: #007bff;');
      expect(scssContent).toContain('$secondary-color: #6c757d;');
      expect(scssContent).toContain('$font-stack: -apple-system');
      expect(scssContent).toContain('$breakpoint-tablet: 768px;');

      // Should have mixins
      expect(scssContent).toContain('@mixin responsive($breakpoint)');

      // Original color values should be replaced with variables
      expect(scssContent).toContain('$primary-color');
      expect(scssContent).toContain('$secondary-color');
      expect(scssContent).toContain('$font-stack');
    });

    it('should include correct devDependencies', () => {
      const result = setupSass(sampleCSS);

      expect(result.devDependencies).toEqual({
        sass: DEPENDENCY_VERSIONS.sass,
        concurrently: DEPENDENCY_VERSIONS.concurrently,
      });
    });

    it('should include correct scripts', () => {
      const result = setupSass(sampleCSS);

      expect(result.scripts['build:css']).toBe(
        'sass src/styles.scss dist/styles.css --style=compressed',
      );
      expect(result.scripts['watch:css']).toBe('sass src/styles.scss dist/styles.css --watch');
      expect(result.scripts.build).toBe('stati build && npm run build:css');
      expect(result.scripts.dev).toBe('concurrently --prefix none "npm run watch:css" "stati dev"');
    });

    it('should include public/styles.css in filesToDelete', () => {
      const result = setupSass(sampleCSS);

      expect(result.filesToDelete).toContain('public/styles.css');
      expect(result.filesToDelete).toHaveLength(1);
    });

    it('should handle CSS without replaceable patterns', () => {
      const simpleCSS = 'body { margin: 0; padding: 10px; }';
      const result = setupSass(simpleCSS);
      const scssContent = result.files.get('src/styles.scss');

      // Should still have variable declarations
      expect(scssContent).toContain('$primary-color: #007bff;');
      expect(scssContent).toContain('$secondary-color: #6c757d;');

      // Original CSS should be in the enhanced styles section
      expect(scssContent).toContain('body { margin: 0; padding: 10px; }');
    });

    it('should handle empty CSS', () => {
      const result = setupSass('');
      const scssContent = result.files.get('src/styles.scss');

      // Should still have variable declarations and mixins
      expect(scssContent).toContain('$primary-color: #007bff;');
      expect(scssContent).toContain('@mixin responsive($breakpoint)');
    });

    it('should replace multiple occurrences of color values', () => {
      const cssWithMultipleColors = `
.primary { color: #007bff; }
.secondary { color: #6c757d; }
.highlight { background: #007bff; border-color: #007bff; }
`;
      const result = setupSass(cssWithMultipleColors);
      const scssContent = result.files.get('src/styles.scss');

      // Count occurrences of the variable (should replace all #007bff occurrences)
      const matches = scssContent?.match(/\$primary-color/g) || [];
      // 1 declaration + 3 usages (color, background, border-color)
      expect(matches.length).toBeGreaterThanOrEqual(4);
    });

    it('should return the same structure when called multiple times', () => {
      const result1 = setupSass(sampleCSS);
      const result2 = setupSass(sampleCSS);

      expect(result1.files.size).toBe(result2.files.size);
      expect(result1.devDependencies).toEqual(result2.devDependencies);
      expect(result1.scripts).toEqual(result2.scripts);
      expect(result1.filesToDelete).toEqual(result2.filesToDelete);
    });
  });
});
