import { readFile } from 'fs/promises';
import { pathExists } from './fs.js';
import type { ErrorDetails } from './error-overlay.js';

/**
 * Enhanced template error that includes file context and suggestions.
 */
export class TemplateError extends Error {
  public readonly filePath?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly template?: string;
  public readonly context?: {
    before?: string[];
    after?: string[];
  };

  constructor(
    message: string,
    filePath?: string,
    line?: number,
    column?: number,
    template?: string,
  ) {
    super(message);
    this.name = 'TemplateError';
    if (filePath !== undefined) this.filePath = filePath;
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
    if (template !== undefined) this.template = template;
  }

  /**
   * Converts this template error to ErrorDetails for the overlay.
   */
  async toErrorDetails(): Promise<ErrorDetails> {
    const suggestions: string[] = [];
    const message = this.message.toLowerCase();

    // Add specific suggestions based on error type
    if (message.includes('not found') || message.includes('cannot resolve')) {
      suggestions.push('Check if the template file exists and has the correct path');
      suggestions.push('Verify the template reference in your layout or include statement');
      suggestions.push('Ensure the template file has the .eta extension');
    } else if (message.includes('syntax') || message.includes('unexpected')) {
      suggestions.push('Check for unmatched brackets, quotes, or parentheses');
      suggestions.push('Verify Eta template syntax is correct');
      suggestions.push('Look for unclosed template tags');
    } else if (message.includes('undefined') || message.includes('null')) {
      suggestions.push('Check if all required data is available in template context');
      suggestions.push('Add conditional checks for optional template variables');
      suggestions.push('Verify page frontMatter and data structure');
    }

    // Try to read file context if available
    let context: { before?: string[]; after?: string[] } | undefined;
    let code: string | undefined;

    if (this.filePath && this.line && (await pathExists(this.filePath))) {
      try {
        const fileContent = await readFile(this.filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const errorLineIndex = this.line - 1;

        if (errorLineIndex >= 0 && errorLineIndex < lines.length) {
          code = lines[errorLineIndex];

          // Get surrounding context
          const contextLines = 3;
          const beforeLines = lines.slice(
            Math.max(0, errorLineIndex - contextLines),
            errorLineIndex,
          );
          const afterLines = lines.slice(
            errorLineIndex + 1,
            Math.min(lines.length, errorLineIndex + contextLines + 1),
          );

          context = {
            before: beforeLines,
            after: afterLines,
          };
        }
      } catch {
        // Ignore file read errors
      }
    }

    const errorDetails: ErrorDetails = {
      type: 'template',
      message: this.message,
      suggestions,
    };

    if (this.stack !== undefined) errorDetails.stack = this.stack;
    if (this.filePath !== undefined) errorDetails.file = this.filePath;
    if (this.line !== undefined) errorDetails.line = this.line;
    if (this.column !== undefined) errorDetails.column = this.column;
    if (code !== undefined) errorDetails.code = code;
    if (context !== undefined) errorDetails.context = context;

    return errorDetails;
  }
}

/**
 * Parses Eta template errors to extract file location information.
 */
export function parseEtaError(error: Error, templatePath?: string): TemplateError {
  let filePath = templatePath;
  let line: number | undefined;
  let column: number | undefined;

  // Try to parse error location from Eta error messages
  const message = error.message;

  // Eta syntax errors often include line/column info
  const locationMatch = message.match(/at line (\d+), column (\d+)/i);
  if (locationMatch && locationMatch[1] && locationMatch[2]) {
    line = parseInt(locationMatch[1], 10);
    column = parseInt(locationMatch[2], 10);
  }

  // Try to extract file path from stack trace if not provided
  if (!filePath && error.stack) {
    const stackLines = error.stack.split('\n');
    for (const stackLine of stackLines) {
      const fileMatch = stackLine.match(/at.*\(([^)]+\.eta):(\d+):(\d+)\)/);
      if (fileMatch && fileMatch[1] && fileMatch[2] && fileMatch[3]) {
        filePath = fileMatch[1];
        line = parseInt(fileMatch[2], 10);
        column = parseInt(fileMatch[3], 10);
        break;
      }
    }
  }

  return new TemplateError(message, filePath, line, column);
}

/**
 * Enhances a generic error with template-specific context.
 */
export function createTemplateError(
  error: Error,
  templatePath?: string,
  _line?: number,
  _column?: number,
): TemplateError {
  if (error instanceof TemplateError) {
    return error;
  }

  return parseEtaError(error, templatePath);
}
