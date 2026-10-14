import { readFile } from 'fs/promises';
import { pathExists } from './fs.utils.js';
import type { ErrorDetails } from './error-overlay.utils.js';
import { parseUnknownPropertyMessage } from './context-validation.utils.js';

/**
 * Enhanced template error that includes file context and suggestions.
 */
export class TemplateError extends Error {
  public readonly filePath?: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly template?: string;
  /** Error-specific suggestions shown before the generic ones in the overlay */
  public readonly suggestions?: string[];
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
    suggestions?: string[],
  ) {
    super(message);
    this.name = 'TemplateError';
    if (filePath !== undefined) this.filePath = filePath;
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
    if (template !== undefined) this.template = template;
    if (suggestions !== undefined) this.suggestions = suggestions;
  }

  /**
   * Converts this template error to ErrorDetails for the overlay.
   */
  async toErrorDetails(): Promise<ErrorDetails> {
    const suggestions: string[] = [...(this.suggestions ?? [])];
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
 * Header that Eta's debug mode prepends to runtime errors:
 * `<path>:<line>` (or `line <line>` without a path), a numbered excerpt of the
 * template, then a blank line and the original message.
 */
const ETA_RUNTIME_ERROR_HEADER = /^(?:(.+):(\d+)|line (\d+))\n(?:(?: >> | {4})\d+\|[^\n]*\n)+\n/;

/**
 * Root template context properties, used to suggest `stati.<name>` when a
 * template references one without the `stati.` prefix.
 */
const CONTEXT_ROOT_NAMES = new Set([
  'site',
  'page',
  'content',
  'nav',
  'partials',
  'collection',
  'props',
  'assets',
  'generator',
  'generateSEO',
  'propValue',
]);

function getReferenceErrorSuggestions(message: string): string[] {
  const name = message.match(/^(\S+) is not defined$/)?.[1];
  if (name === 'it') {
    return ['Stati templates use "stati" instead of Eta\'s default "it", e.g. stati.page.title'];
  }
  if (name && CONTEXT_ROOT_NAMES.has(name)) {
    return [`Did you mean "stati.${name}"?`];
  }
  return [];
}

/**
 * Parses Eta template errors to extract file location information.
 */
export function parseEtaError(error: Error, templatePath?: string): TemplateError {
  let filePath = templatePath;
  let line: number | undefined;
  let column: number | undefined;
  let message = error.message;

  // Eta's debug mode wraps runtime errors in a header with the template path and
  // line. A partial rendered inside another template is wrapped once per level,
  // so unwrap them all and keep the innermost location.
  let header = message.match(ETA_RUNTIME_ERROR_HEADER);
  while (header) {
    if (header[1] !== undefined) {
      filePath = header[1];
    }
    // The regex captures the line in group 2 (with a path) or group 3 (without)
    line = parseInt(header[2] ?? header[3]!, 10);
    column = undefined;
    message = message.slice(header[0].length);
    header = message.match(ETA_RUNTIME_ERROR_HEADER);
  }

  // Eta syntax errors report "at line N col N"
  const locationMatch = message.match(/at line (\d+),? col(?:umn)? (\d+)/i);
  if (locationMatch && locationMatch[1] && locationMatch[2]) {
    line = parseInt(locationMatch[1], 10);
    column = parseInt(locationMatch[2], 10);
  }

  let suggestions: string[] = [];
  const unknownProperty = parseUnknownPropertyMessage(message);
  if (unknownProperty) {
    message = unknownProperty.message;
    suggestions = unknownProperty.suggestions;
  } else if (error.name === 'ReferenceError') {
    suggestions = getReferenceErrorSuggestions(message);
  }

  // Try to extract file path from stack trace if not provided
  if (!filePath && line === undefined && error.stack) {
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

  return new TemplateError(message, filePath, line, column, undefined, suggestions);
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
