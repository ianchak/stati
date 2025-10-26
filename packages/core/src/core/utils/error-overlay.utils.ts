/**
 * Error overlay utility for displaying pretty errors in development mode.
 * Provides a user-friendly interface for template rendering and build errors.
 */

export interface ErrorDetails {
  type: 'template' | 'build' | 'markdown' | 'config';
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  context?: {
    before?: string[];
    after?: string[];
  };
  suggestions?: string[];
}

/**
 * Creates a styled error overlay HTML that displays comprehensive error information.
 *
 * @param error - The error details to display
 * @param requestPath - The path that triggered the error
 * @returns HTML string for the error overlay
 */
export function createErrorOverlay(error: ErrorDetails, requestPath: string): string {
  const timestamp = new Date().toLocaleTimeString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stati Development Error</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
      color: #ffffff;
      line-height: 1.6;
      min-height: 100vh;
      overflow-y: auto;
    }

    .error-overlay {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .error-header {
      background: linear-gradient(90deg, #ff6b6b 0%, #ee5a52 100%);
      padding: 24px 32px;
      box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
    }

    .error-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .error-icon {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .error-subtitle {
      font-size: 14px;
      opacity: 0.9;
      font-weight: 400;
    }

    .error-content {
      flex: 1;
      padding: 32px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .error-section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #ff6b6b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .error-message {
      background: rgba(255, 107, 107, 0.1);
      border: 1px solid rgba(255, 107, 107, 0.3);
      border-radius: 8px;
      padding: 16px;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .error-location {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .location-item {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .location-label {
      color: #888;
      font-weight: 500;
    }

    .location-value {
      color: #ffffff;
      font-weight: 600;
    }

    .code-block {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    }

    .code-header {
      background: rgba(255, 255, 255, 0.05);
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 14px;
      color: #888;
    }

    .code-content {
      padding: 0;
      overflow-x: auto;
    }

    .code-line {
      display: flex;
      align-items: center;
      padding: 0 16px;
      min-height: 24px;
      font-size: 14px;
    }

    .code-line:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .line-number {
      color: #666;
      margin-right: 16px;
      min-width: 40px;
      text-align: right;
      font-weight: 500;
    }

    .line-error {
      background: rgba(255, 107, 107, 0.2);
      border-left: 4px solid #ff6b6b;
    }

    .line-error .line-number {
      color: #ff6b6b;
      font-weight: 600;
    }

    .line-context {
      background: rgba(255, 255, 255, 0.03);
    }

    .suggestions {
      background: rgba(52, 211, 153, 0.1);
      border: 1px solid rgba(52, 211, 153, 0.3);
      border-radius: 8px;
      padding: 16px;
    }

    .suggestions-title {
      color: #34d399;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .suggestion-item {
      background: rgba(52, 211, 153, 0.05);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      border-left: 3px solid #34d399;
    }

    .suggestion-item:last-child {
      margin-bottom: 0;
    }

    .stack-trace {
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.4;
      overflow-x: auto;
      white-space: pre-wrap;
      color: #ccc;
    }

    .footer {
      background: rgba(255, 255, 255, 0.05);
      padding: 16px 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: #888;
    }

    .footer-info {
      display: flex;
      gap: 24px;
    }

    .refresh-button {
      background: #ff6b6b;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .refresh-button:hover {
      background: #ee5a52;
    }

    .type-badge {
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-template { background: rgba(147, 51, 234, 0.2); color: #a855f7; }
    .type-build { background: rgba(245, 101, 101, 0.2); color: #f56565; }
    .type-markdown { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .type-config { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }

    @media (max-width: 768px) {
      .error-content {
        padding: 16px;
      }

      .error-header {
        padding: 16px 24px;
      }

      .error-title {
        font-size: 20px;
      }

      .error-location {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="error-overlay">
    <div class="error-header">
      <div class="error-title">
        <div class="error-icon">⚠️</div>
        Stati Development Error
        <span class="type-badge type-${error.type}">${error.type}</span>
      </div>
      <div class="error-subtitle">
        ${
          error.type === 'template'
            ? 'Template rendering failed'
            : error.type === 'build'
              ? 'Build process failed'
              : error.type === 'markdown'
                ? 'Markdown processing failed'
                : 'Configuration error'
        } • ${timestamp}
      </div>
    </div>

    <div class="error-content">
      <div class="error-section">
        <div class="section-title">
          🚨 Error Details
        </div>
        <div class="error-message">
          ${escapeHtml(error.message)}
        </div>

        ${
          error.file || error.line
            ? `
        <div class="error-location">
          ${
            error.file
              ? `<div class="location-item">
            <span class="location-label">File:</span>
            <span class="location-value">${escapeHtml(error.file)}</span>
          </div>`
              : ''
          }
          ${
            error.line
              ? `<div class="location-item">
            <span class="location-label">Line:</span>
            <span class="location-value">${error.line}${error.column ? `:${error.column}` : ''}</span>
          </div>`
              : ''
          }
          <div class="location-item">
            <span class="location-label">Route:</span>
            <span class="location-value">${escapeHtml(requestPath)}</span>
          </div>
        </div>
        `
            : ''
        }
      </div>

      ${
        error.code || error.context
          ? `
      <div class="error-section">
        <div class="section-title">
          📄 Code Context
        </div>
        <div class="code-block">
          ${error.file ? `<div class="code-header">${escapeHtml(error.file)}</div>` : ''}
          <div class="code-content">
            ${formatCodeContext(error)}
          </div>
        </div>
      </div>
      `
          : ''
      }

      ${
        error.suggestions && error.suggestions.length > 0
          ? `
      <div class="error-section">
        <div class="suggestions">
          <div class="suggestions-title">
            💡 Suggestions
          </div>
          ${error.suggestions
            .map(
              (suggestion) => `
            <div class="suggestion-item">
              ${escapeHtml(suggestion)}
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }

      ${
        error.stack
          ? `
      <div class="error-section">
        <div class="section-title">
          🔍 Stack Trace
        </div>
        <div class="stack-trace">${escapeHtml(error.stack)}</div>
      </div>
      `
          : ''
      }
    </div>

    <div class="footer">
      <div class="footer-info">
        <span>Stati Development Server</span>
        <span>•</span>
        <span>Fix the error and save to automatically reload</span>
      </div>
      <button class="refresh-button" onclick="window.location.reload()">
        Refresh
      </button>
    </div>
  </div>

  <script>
    // Auto-refresh when files change (if WebSocket connection exists)
    if (typeof WebSocket !== 'undefined') {
      try {
        const ws = new WebSocket('ws://localhost:3000/__ws');
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            window.location.reload();
          }
        };
      } catch (e) {
        // WebSocket connection failed, that's okay
      }
    }

    // Keyboard shortcut to refresh (Ctrl/Cmd + R)
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Escapes HTML characters in a string for safe display.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats code context with line numbers and highlighting.
 */
function formatCodeContext(error: ErrorDetails): string {
  if (!error.context && !error.code) {
    return '<div class="code-line"><span class="line-number">-</span>No code context available</div>';
  }

  const lines: string[] = [];
  const errorLine = error.line || 0;
  let currentLine = errorLine;

  if (error.context?.before) {
    currentLine = errorLine - error.context.before.length;
    error.context.before.forEach((line) => {
      lines.push(`<div class="code-line line-context">
        <span class="line-number">${currentLine}</span>
        <span class="line-content">${escapeHtml(line)}</span>
      </div>`);
      currentLine++;
    });
  }

  if (error.code) {
    lines.push(`<div class="code-line line-error">
      <span class="line-number">${errorLine}</span>
      <span class="line-content">${escapeHtml(error.code)}</span>
    </div>`);
    currentLine = errorLine + 1;
  }

  if (error.context?.after) {
    error.context.after.forEach((line) => {
      lines.push(`<div class="code-line line-context">
        <span class="line-number">${currentLine}</span>
        <span class="line-content">${escapeHtml(line)}</span>
      </div>`);
      currentLine++;
    });
  }

  return lines.join('');
}

/**
 * Parses error information from various error types to create structured ErrorDetails.
 */
export function parseErrorDetails(
  error: Error,
  type: ErrorDetails['type'],
  filePath?: string,
): ErrorDetails {
  const details: ErrorDetails = {
    type,
    message: error.message,
  };

  if (error.stack) {
    details.stack = error.stack;
  }

  // Try to extract file and line information from the stack trace
  if (error.stack) {
    const stackLines = error.stack.split('\n');
    for (const line of stackLines) {
      // Look for file paths in the stack trace
      const match = line.match(/at\s+.*\((.+):(\d+):(\d+)\)/);
      if (match && match[1] && match[2] && match[3] && !match[1].includes('node_modules')) {
        details.file = match[1];
        details.line = parseInt(match[2], 10);
        details.column = parseInt(match[3], 10);
        break;
      }
    }
  }

  // Override with provided file path if available
  if (filePath) {
    details.file = filePath;
  }

  // Add type-specific suggestions
  details.suggestions = getErrorSuggestions(error, type);

  return details;
}

/**
 * Provides helpful suggestions based on error type and message.
 */
function getErrorSuggestions(error: Error, type: ErrorDetails['type']): string[] {
  const suggestions: string[] = [];
  const message = error.message.toLowerCase();

  if (type === 'template') {
    if (message.includes('not found') || message.includes('cannot resolve')) {
      suggestions.push('Check if the template file exists in the correct location');
      suggestions.push(
        'Verify the template file path is correct in your layout or include statement',
      );
      suggestions.push('Ensure the template file has the correct .eta extension');
    }

    if (message.includes('syntax') || message.includes('unexpected token')) {
      suggestions.push('Check for missing or extra brackets, quotes, or commas in your template');
      suggestions.push('Verify that all Eta template syntax is correctly formatted');
      suggestions.push('Look for unclosed tags or expressions');
    }

    if (message.includes('undefined') || message.includes('null')) {
      suggestions.push('Check if all required data is being passed to the template');
      suggestions.push('Add conditional checks for optional data in your template');
      suggestions.push('Verify that page frontMatter and content are properly structured');
    }
  } else if (type === 'build') {
    if (message.includes('permission') || message.includes('eacces')) {
      suggestions.push('Check file and directory permissions');
      suggestions.push('Ensure Stati has write access to the output directory');
    }

    if (message.includes('space') || message.includes('enospc')) {
      suggestions.push('Free up disk space on your system');
      suggestions.push('Check if the output directory has sufficient space');
    }
  } else if (type === 'markdown') {
    if (message.includes('front-matter') || message.includes('yaml')) {
      suggestions.push('Check the YAML front-matter syntax for errors');
      suggestions.push('Ensure front-matter is properly enclosed in --- markers');
      suggestions.push(
        'Verify that all YAML values are properly quoted if they contain special characters',
      );
    }
  }

  // General suggestions
  suggestions.push('Save the file and the page will automatically reload');
  suggestions.push('Check the Stati documentation for more help');

  return suggestions;
}
