/**
 * Error overlay utility for displaying pretty errors in development mode.
 * Provides a user-friendly interface for template rendering and build errors.
 */

import { STATI_FAVICON_HREF, STATI_MARK_PATH, STATI_THEME_STYLES } from './theme.utils.js';
import { LIVE_RELOAD_PATH } from './live-reload.utils.js';

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

const ERROR_HEADLINES: Record<ErrorDetails['type'], string> = {
  template: 'Template rendering failed',
  build: 'Build process failed',
  markdown: 'Markdown processing failed',
  config: 'Configuration error',
};

const OVERLAY_STYLES = `${STATI_THEME_STYLES}

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    html {
      background-color: rgb(var(--canvas));
      scrollbar-color: rgb(var(--line-strong)) transparent;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: rgb(var(--canvas));
      color: rgb(var(--ink));
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.6;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1, 'cv11' 1;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    ::selection {
      background-color: rgb(var(--accent) / 0.25);
    }

    :focus-visible {
      outline: 2px solid rgb(var(--accent));
      outline-offset: 2px;
    }

    h1,
    h2,
    p,
    pre,
    dl,
    dd,
    ul,
    figure {
      margin: 0;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .shell {
      width: 100%;
      max-width: 72rem;
      margin: 0 auto;
      padding-left: 1rem;
      padding-right: 1rem;
    }

    /* Header bar */

    .bar {
      border-bottom: 1px solid rgb(var(--line));
    }

    .bar .shell {
      min-height: 3.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
      padding-top: 0.625rem;
      padding-bottom: 0.625rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
    }

    .brand-mark {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      color: rgb(var(--accent));
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 800;
      font-stretch: 112%;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .brand-rule {
      width: 1px;
      height: 1rem;
      background-color: rgb(var(--line-strong));
    }

    .brand-context {
      font-size: 0.875rem;
      font-weight: 500;
      color: rgb(var(--muted));
      white-space: nowrap;
    }

    .bar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: rgb(var(--muted));
    }

    .status-dot {
      width: 0.5rem;
      height: 0.5rem;
      flex: none;
      border-radius: 50%;
      border: 1px solid rgb(var(--faint));
      transition: background-color 150ms, border-color 150ms;
    }

    .status[data-state='live'] .status-dot {
      background-color: rgb(var(--ink));
      border-color: rgb(var(--ink));
    }

    .status[data-state='off'] .status-dot {
      border-color: rgb(var(--danger));
    }

    .button {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2.25rem;
      padding: 0.5rem 0.875rem;
      border: 0;
      border-radius: 8px;
      background-color: rgb(var(--accent));
      color: rgb(var(--on-accent));
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.25;
      cursor: pointer;
      transition: background-color 150ms;
    }

    .button:hover {
      background-color: rgb(var(--accent-ink));
    }

    .button kbd {
      padding: 0.0625rem 0.3125rem;
      border: 1px solid rgb(var(--on-accent) / 0.4);
      border-radius: 4px;
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.75rem;
      font-weight: 400;
      line-height: 1.4;
    }

    /* Main content */

    .main {
      flex: 1;
      padding-top: 2.5rem;
      padding-bottom: 4rem;
    }

    .summary {
      max-width: 56rem;
    }

    .headline {
      font-family: var(--font-display);
      font-size: 1.875rem;
      font-weight: 800;
      font-stretch: 108%;
      letter-spacing: -0.015em;
      line-height: 1.1;
      text-wrap: balance;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      margin-top: 0.875rem;
      font-size: 0.875rem;
      color: rgb(var(--muted));
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      border: 1px solid rgb(var(--line-strong));
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.5;
      color: rgb(var(--ink));
      text-transform: capitalize;
    }

    .meta-time {
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: rgb(var(--faint));
    }

    .message {
      margin-top: 1.5rem;
      padding: 1rem 1.25rem;
      border: 1px solid rgb(var(--danger) / 0.35);
      border-radius: 8px;
      background-color: rgb(var(--danger-wash));
    }

    .message-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: rgb(var(--danger));
    }

    .message-text {
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.875rem;
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: rgb(var(--ink));
    }

    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 2.5rem;
      margin-top: 1.25rem;
    }

    .fact {
      min-width: 0;
    }

    .fact dt {
      font-size: 0.8125rem;
      color: rgb(var(--faint));
    }

    .fact dd {
      margin-top: 0.125rem;
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
      color: rgb(var(--ink));
    }

    /* Sections */

    .section {
      margin-top: 2.5rem;
      padding-top: 1.75rem;
      border-top: 1px solid rgb(var(--line));
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      font-stretch: 108%;
      letter-spacing: -0.01em;
      line-height: 1.25;
    }

    .section-title + * {
      margin-top: 1rem;
    }

    /* Code panel */

    .panel {
      overflow: hidden;
      border: 1px solid rgb(var(--line));
      border-radius: 8px;
      background-color: rgb(var(--sunken));
    }

    .panel-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid rgb(var(--line));
      background-color: rgb(var(--canvas));
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.75rem;
      line-height: 1.5;
      color: rgb(var(--faint));
    }

    .panel-file {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .panel-pos {
      flex: none;
      font-variant-numeric: tabular-nums;
    }

    .code {
      overflow-x: auto;
      padding: 0.75rem 0;
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.8125rem;
      line-height: 1.65;
      tab-size: 2;
    }

    .code-lines {
      min-width: 100%;
      width: max-content;
    }

    .code-line {
      display: flex;
      padding-right: 1.25rem;
    }

    .line-number {
      flex: none;
      width: 4.5ch;
      margin-right: 1.25rem;
      padding-left: 0.75rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: rgb(var(--faint));
      user-select: none;
    }

    .line-content {
      white-space: pre;
      color: rgb(var(--muted));
    }

    .line-error {
      background-color: rgb(var(--danger) / 0.1);
    }

    .line-error .line-number {
      font-weight: 600;
      color: rgb(var(--danger));
    }

    .line-error .line-content {
      color: rgb(var(--ink));
    }

    /* Suggestions */

    .suggestions {
      padding: 0;
      list-style: none;
    }

    .suggestion-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-top: 1px solid rgb(var(--line));
      color: rgb(var(--muted));
      max-width: 48rem;
    }

    .suggestions .suggestion-item:first-child {
      border-top-color: rgb(var(--ink));
    }

    .suggestion-icon {
      width: 1rem;
      height: 1rem;
      flex: none;
      margin-top: 0.3rem;
      color: rgb(var(--faint));
    }

    /* Stack trace */

    .stack summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: fit-content;
      cursor: pointer;
      list-style: none;
      border-radius: 4px;
    }

    .stack summary::-webkit-details-marker {
      display: none;
    }

    .stack-chevron {
      width: 1rem;
      height: 1rem;
      flex: none;
      color: rgb(var(--faint));
      transition: transform 150ms;
    }

    .stack[open] .stack-chevron {
      transform: rotate(90deg);
    }

    .stack-count {
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
      color: rgb(var(--faint));
    }

    .stack summary:hover .section-title {
      color: rgb(var(--accent-ink));
    }

    .stack-trace {
      margin-top: 1rem;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      border: 1px solid rgb(var(--line));
      border-radius: 8px;
      background-color: rgb(var(--sunken));
      font-family: var(--font-mono);
      font-feature-settings: normal;
      font-variant-ligatures: none;
      font-size: 0.8125rem;
      line-height: 1.65;
      white-space: pre;
      color: rgb(var(--muted));
    }

    .stack-head {
      color: rgb(var(--ink));
    }

    .stack-dim {
      color: rgb(var(--faint));
    }

    /* Footer */

    .footer {
      border-top: 1px solid rgb(var(--line));
      font-size: 0.8125rem;
      color: rgb(var(--faint));
    }

    .footer .shell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      padding-top: 1rem;
      padding-bottom: 1rem;
    }

    .footer-name {
      font-weight: 600;
      color: rgb(var(--muted));
    }

    @media (prefers-reduced-motion: no-preference) {
      .main {
        animation: overlay-in 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @keyframes overlay-in {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
    }

    @media (hover: none) {
      .button kbd {
        display: none;
      }
    }

    @media (min-width: 640px) {
      .shell {
        padding-left: 1.5rem;
        padding-right: 1.5rem;
      }

      .main {
        padding-top: 3.5rem;
      }

      .headline {
        font-size: 2.25rem;
      }

      .code {
        font-size: 0.875rem;
      }
    }

    @media (min-width: 1024px) {
      .shell {
        padding-left: 3rem;
        padding-right: 3rem;
      }

      .headline {
        font-size: 2.75rem;
      }
    }

    @media (max-width: 639px) {
      .bar-actions {
        width: 100%;
        justify-content: space-between;
      }

      .button {
        min-height: 2.75rem;
      }
    }`;

/**
 * Live reload and refresh controls for the overlay page. The overlay is served
 * instead of the page, so it needs its own connection to the dev server.
 */
const OVERLAY_SCRIPT = `
    (function () {
      var status = document.getElementById('stati-status');
      var statusText = document.getElementById('stati-status-text');
      var reloadButton = document.getElementById('stati-reload');
      var shortcut = document.getElementById('stati-shortcut');

      function reload() {
        window.location.reload();
      }

      function setStatus(state, text) {
        status.setAttribute('data-state', state);
        statusText.textContent = text;
      }

      if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
        shortcut.textContent = '\\u2318R';
      }

      reloadButton.addEventListener('click', reload);

      // Keyboard shortcut to refresh (Ctrl/Cmd + R)
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
          e.preventDefault();
          reload();
        }
      });

      // Auto-refresh when files change, over the dev server's WebSocket
      if (typeof WebSocket === 'undefined') {
        setStatus('off', 'Live reload unavailable');
        return;
      }

      var connectedBefore = false;
      var retryDelay = 1000;

      function connect() {
        var ws;
        try {
          var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
          ws = new WebSocket(protocol + window.location.host + '${LIVE_RELOAD_PATH}');
        } catch (e) {
          setStatus('off', 'Live reload unavailable');
          return;
        }

        ws.onopen = function () {
          // The server restarted while we were away; load the fresh build
          if (connectedBefore) {
            reload();
            return;
          }
          connectedBefore = true;
          retryDelay = 1000;
          setStatus('live', 'Watching for changes');
        };

        ws.onmessage = function (event) {
          try {
            if (JSON.parse(event.data).type === 'reload') {
              reload();
            }
          } catch (e) {
            // Ignore messages that are not JSON
          }
        };

        ws.onclose = function () {
          setStatus('off', 'Reconnecting to dev server');
          setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 8000);
        };
      }

      connect();
    })();`;

/**
 * Creates a styled error overlay HTML that displays comprehensive error information.
 *
 * @param error - The error details to display
 * @param requestPath - The path that triggered the error
 * @returns HTML string for the error overlay
 */
export function createErrorOverlay(error: ErrorDetails, requestPath: string): string {
  const timestamp = new Date().toLocaleTimeString();
  const position = error.line ? `${error.line}${error.column ? `:${error.column}` : ''}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="${STATI_FAVICON_HREF}">
  <title>Stati Development Error</title>
  <style>${OVERLAY_STYLES}
  </style>
</head>
<body>
  <header class="bar">
    <div class="shell">
      <div class="brand">
        <svg class="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${STATI_MARK_PATH}"/></svg>
        <span class="brand-name">Stati</span>
        <span class="brand-rule" aria-hidden="true"></span>
        <span class="brand-context">Development error</span>
      </div>
      <div class="bar-actions">
        <span class="status" id="stati-status" data-state="connecting" role="status">
          <span class="status-dot" aria-hidden="true"></span>
          <span id="stati-status-text">Connecting to dev server</span>
        </span>
        <button type="button" class="button" id="stati-reload">
          Refresh
          <kbd id="stati-shortcut" aria-hidden="true">Ctrl+R</kbd>
        </button>
      </div>
    </div>
  </header>

  <main class="main shell">
    <section class="summary" aria-labelledby="stati-error-title">
      <h1 class="headline" id="stati-error-title">${ERROR_HEADLINES[error.type]}</h1>
      <p class="meta">
        <span class="type-badge">${error.type}</span>
        <time class="meta-time">${escapeHtml(timestamp)}</time>
      </p>

      <div class="message">
        <span class="message-label">Error details</span>
        <pre class="message-text">${escapeHtml(error.message)}</pre>
      </div>

      <dl class="facts">
        ${
          error.file
            ? `<div class="fact">
          <dt>File</dt>
          <dd>${escapeHtml(error.file)}</dd>
        </div>`
            : ''
        }
        ${
          position
            ? `<div class="fact">
          <dt>Line</dt>
          <dd>${position}</dd>
        </div>`
            : ''
        }
        <div class="fact">
          <dt>Route</dt>
          <dd>${escapeHtml(requestPath)}</dd>
        </div>
      </dl>
    </section>

    ${
      error.code || error.context
        ? `
    <section class="section" aria-labelledby="stati-code-title">
      <h2 class="section-title" id="stati-code-title">Code context</h2>
      <figure class="panel">
        ${
          error.file
            ? `<figcaption class="panel-bar">
          <span class="panel-file">${escapeHtml(error.file)}</span>
          ${position ? `<span class="panel-pos">${position}</span>` : ''}
        </figcaption>`
            : ''
        }
        <div class="code" tabindex="0" role="region" aria-label="Source code around the error">
          <div class="code-lines">${formatCodeContext(error)}</div>
        </div>
      </figure>
    </section>
    `
        : ''
    }

    ${
      error.suggestions && error.suggestions.length > 0
        ? `
    <section class="section" aria-labelledby="stati-suggestions-title">
      <h2 class="section-title" id="stati-suggestions-title">Suggestions</h2>
      <ul class="suggestions">
        ${error.suggestions
          .map(
            (suggestion) => `
        <li class="suggestion-item">
          <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          <span>${escapeHtml(suggestion)}</span>
        </li>`,
          )
          .join('')}
      </ul>
    </section>
    `
        : ''
    }

    ${
      error.stack
        ? `
    <details class="section stack" open>
      <summary>
        <svg class="stack-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        <h2 class="section-title">Stack trace</h2>
        ${formatFrameCount(error.stack)}
      </summary>
      <pre class="stack-trace">${formatStack(error.stack)}</pre>
    </details>
    `
        : ''
    }
  </main>

  <footer class="footer">
    <div class="shell">
      <span class="footer-name">Stati Development Server</span>
      <span>Fix the error and save to automatically reload</span>
    </div>
  </footer>

  <script>${OVERLAY_SCRIPT}
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
 * Renders one numbered source line for the code context panel.
 */
function formatCodeLine(lineNumber: number | string, content: string, isError: boolean): string {
  return `<div class="code-line${isError ? ' line-error' : ''}"><span class="line-number">${lineNumber}${
    isError ? '<span class="sr-only"> (error)</span>' : ''
  }</span><span class="line-content">${escapeHtml(content)}</span></div>`;
}

/**
 * Formats code context with line numbers and highlighting.
 */
function formatCodeContext(error: ErrorDetails): string {
  const lines: string[] = [];
  const errorLine = error.line || 0;
  let currentLine = errorLine;

  if (error.context?.before) {
    currentLine = errorLine - error.context.before.length;
    error.context.before.forEach((line) => {
      lines.push(formatCodeLine(currentLine, line, false));
      currentLine++;
    });
  }

  if (error.code) {
    lines.push(formatCodeLine(errorLine, error.code, true));
    currentLine = errorLine + 1;
  }

  if (error.context?.after) {
    error.context.after.forEach((line) => {
      lines.push(formatCodeLine(currentLine, line, false));
      currentLine++;
    });
  }

  return lines.join('');
}

const STACK_FRAME = /^\s+at\s/;

/**
 * Formats a stack trace, keeping the first line prominent and dimming frames
 * from dependencies and Node internals so the user's own frames stand out.
 */
function formatStack(stack: string): string {
  return stack
    .split('\n')
    .map((line, index) => {
      const escaped = escapeHtml(line);
      if (index === 0 && !STACK_FRAME.test(line)) {
        return `<span class="stack-head">${escaped}</span>`;
      }
      if (/node_modules|\(node:|\bat node:/.test(line)) {
        return `<span class="stack-dim">${escaped}</span>`;
      }
      return escaped;
    })
    .join('\n');
}

/**
 * Renders the frame count shown beside the stack trace heading.
 */
function formatFrameCount(stack: string): string {
  const frames = stack.split('\n').filter((line) => STACK_FRAME.test(line)).length;
  return frames > 0
    ? `<span class="stack-count">${frames} ${frames === 1 ? 'frame' : 'frames'}</span>`
    : '';
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
    if (
      message.includes('front matter') ||
      message.includes('front-matter') ||
      message.includes('yaml')
    ) {
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
