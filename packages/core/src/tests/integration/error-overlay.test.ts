import { describe, it, expect } from 'vitest';
import { createErrorOverlay, parseErrorDetails } from '../../core/utils/error-overlay.js';
import {
  TemplateError,
  createTemplateError,
  parseEtaError,
} from '../../core/utils/template-errors.js';

describe('Error Overlay', () => {
  describe('createErrorOverlay', () => {
    it('should create HTML for template errors', () => {
      const errorDetails = {
        type: 'template' as const,
        message: 'Unexpected token in template',
        file: '/src/layout.eta',
        line: 15,
        column: 20,
        code: '<% if (condition) { %>',
        suggestions: ['Check for unmatched brackets', 'Verify template syntax'],
      };

      const html = createErrorOverlay(errorDetails, '/');

      expect(html).toContain('Stati Development Error');
      expect(html).toContain('template');
      expect(html).toContain('Unexpected token in template');
      expect(html).toContain('/src/layout.eta');
      expect(html).toContain('Line:</span>');
      expect(html).toContain('15:20');
      expect(html).toContain('Check for unmatched brackets');
    });

    it('should create HTML for build errors', () => {
      const errorDetails = {
        type: 'build' as const,
        message: 'Build failed during processing',
        suggestions: ['Check file permissions', 'Verify configuration'],
      };

      const html = createErrorOverlay(errorDetails, '/about');

      expect(html).toContain('Stati Development Error');
      expect(html).toContain('build');
      expect(html).toContain('Build failed during processing');
      expect(html).toContain('Check file permissions');
    });

    it('should handle errors without optional properties', () => {
      const errorDetails = {
        type: 'markdown' as const,
        message: 'Invalid front-matter',
      };

      const html = createErrorOverlay(errorDetails, '/blog');

      expect(html).toContain('Stati Development Error');
      expect(html).toContain('markdown');
      expect(html).toContain('Invalid front-matter');
    });
  });

  describe('parseErrorDetails', () => {
    it('should parse basic error information', () => {
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.js:10:5';

      const details = parseErrorDetails(error, 'build', '/test/file.js');

      expect(details.type).toBe('build');
      expect(details.message).toBe('Test error message');
      expect(details.stack).toBe(error.stack);
      expect(details.file).toBe('/test/file.js');
    });

    it('should provide appropriate suggestions for different error types', () => {
      const templateError = new Error('Template not found');
      const templateDetails = parseErrorDetails(templateError, 'template');

      expect(templateDetails.suggestions).toContain(
        'Check if the template file exists in the correct location',
      );

      const buildError = new Error('Permission denied');
      const buildDetails = parseErrorDetails(buildError, 'build');

      expect(buildDetails.suggestions).toContain('Check file and directory permissions');
    });
  });

  describe('TemplateError', () => {
    it('should create enhanced template error with context', async () => {
      const templateError = new TemplateError(
        'Syntax error in template',
        '/src/layout.eta',
        10,
        15,
      );

      const errorDetails = await templateError.toErrorDetails();

      expect(errorDetails.type).toBe('template');
      expect(errorDetails.message).toBe('Syntax error in template');
      expect(errorDetails.file).toBe('/src/layout.eta');
      expect(errorDetails.line).toBe(10);
      expect(errorDetails.column).toBe(15);
      expect(errorDetails.suggestions).toBeDefined();
      expect(errorDetails.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('parseEtaError', () => {
    it('should parse Eta error messages', () => {
      const etaError = new Error('Bad template syntax at line 5, column 10');
      const templateError = parseEtaError(etaError, '/src/test.eta');

      expect(templateError.message).toBe('Bad template syntax at line 5, column 10');
      expect(templateError.filePath).toBe('/src/test.eta');
      expect(templateError.line).toBe(5);
      expect(templateError.column).toBe(10);
    });

    it('should handle errors without location info', () => {
      const genericError = new Error('Generic template error');
      const templateError = parseEtaError(genericError);

      expect(templateError.message).toBe('Generic template error');
      expect(templateError.filePath).toBeUndefined();
      expect(templateError.line).toBeUndefined();
    });
  });

  describe('createTemplateError', () => {
    it('should return existing TemplateError unchanged', () => {
      const originalError = new TemplateError('Original error', '/src/test.eta', 5, 10);
      const result = createTemplateError(originalError, '/src/other.eta');

      expect(result).toBe(originalError);
      expect(result.filePath).toBe('/src/test.eta');
    });

    it('should create new TemplateError from generic error', () => {
      const genericError = new Error('Generic error');
      const result = createTemplateError(genericError, '/src/layout.eta');

      expect(result).toBeInstanceOf(TemplateError);
      expect(result.message).toBe('Generic error');
    });
  });
});
