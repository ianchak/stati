import { performance } from 'node:perf_hooks';

/**
 * Ice Blue Mono-Hue Palette — Single source of truth for CLI colors
 */
const palette = {
  // Brand hue family (Ice Blue)
  brandStrong: '#bae6fd', // sky-200 — numbers, emphasis, stats
  brand: '#38bdf8', // sky-400 — headers, step indicators, folders
  brandDim: '#0ea5e9', // sky-500 — gradient start, subtle brand

  // Neutral ramp
  fg: '#e5e7eb', // gray-200 — default foreground (rarely used)
  muted: '#94a3b8', // slate-400 — labels, file paths
  dim: '#64748b', // slate-500 — timing, metadata
  faint: '#475569', // slate-600 — very subtle elements

  // Status glyph colors (glyph/prefix only, not full message)
  successGlyph: '#22c55e', // green-500
  warningGlyph: '#f59e0b', // amber-500
  errorGlyph: '#ef4444', // red-500
} as const;

/**
 * Unicode glyphs for terminal-safe output
 */
const glyphs = {
  success: '✓',
  warning: '!',
  error: '×',
  info: '•',
  bullet: '•',
  continuation: '↳',
  arrow: '→',
  fileCreate: '+',
  fileUpdate: '~',
  fileCopy: '=',
} as const;

/**
 * ASCII fallback glyphs for environments that don't support Unicode
 */
const glyphsAscii = {
  success: 'OK',
  warning: 'WARN',
  error: 'ERR',
  info: '*',
  bullet: '*',
  continuation: '->',
  arrow: '->',
  fileCreate: '+',
  fileUpdate: '~',
  fileCopy: '=',
} as const;

/**
 * Check if color output is enabled
 */
function isColorEnabled(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  if (!process.stdout.isTTY) return false;
  return true;
}

/**
 * Get current icon mode (unicode or ascii)
 */
type IconMode = 'unicode' | 'ascii';
function getIconMode(): IconMode {
  const asciiEnv = process.env.STATI_ASCII_ICONS?.toLowerCase();
  if (asciiEnv === '1' || asciiEnv === 'true' || asciiEnv === 'yes') return 'ascii';
  return 'unicode';
}

/**
 * Get a glyph based on current icon mode
 */
function getGlyph(name: keyof typeof glyphs): string {
  return getIconMode() === 'ascii' ? glyphsAscii[name] : glyphs[name];
}

/**
 * Convert hex color to ANSI RGB escape code
 */
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Parse hex color to RGB tuple
 */
function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Interpolate between two hex colors
 */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = parseHex(colorA);
  const [r2, g2, b2] = parseHex(colorB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Create a color function that respects NO_COLOR
 */
function createColorFn(ansiCode: string): (text: string) => string {
  return (text: string) => (isColorEnabled() ? `${ansiCode}${text}\x1b[0m` : text);
}

/**
 * Professional color utilities for CLI output
 * Uses Ice Blue mono-hue palette for consistent, cohesive styling
 */
export const colors = {
  // Brand colors (Ice Blue)
  brand: createColorFn(hexToAnsi(palette.brand)),
  brandStrong: createColorFn(hexToAnsi(palette.brandStrong)),
  brandDim: createColorFn(hexToAnsi(palette.brandDim)),

  // Neutral colors
  muted: createColorFn(hexToAnsi(palette.muted)),
  dim: createColorFn(hexToAnsi(palette.dim)),
  faint: createColorFn(hexToAnsi(palette.faint)),

  // Status glyph colors (for glyphs only, not full messages)
  successGlyph: createColorFn(hexToAnsi(palette.successGlyph)),
  warningGlyph: createColorFn(hexToAnsi(palette.warningGlyph)),
  errorGlyph: createColorFn(hexToAnsi(palette.errorGlyph)),

  // Text formatting
  bold: (text: string) => (isColorEnabled() ? `\x1b[1m${text}\x1b[0m` : text),
  underline: (text: string) => (isColorEnabled() ? `\x1b[4m${text}\x1b[0m` : text),

  // Semantic aliases (using new palette)
  file: createColorFn(hexToAnsi(palette.muted)),
  folder: createColorFn(hexToAnsi(palette.brand)),
  url: (text: string) =>
    isColorEnabled() ? `\x1b[4m${hexToAnsi(palette.brand)}${text}\x1b[0m` : text,
  timing: createColorFn(hexToAnsi(palette.dim)),

  // Legacy compatibility (mapped to new palette)
  success: createColorFn(hexToAnsi(palette.successGlyph)),
  error: createColorFn(hexToAnsi(palette.errorGlyph)),
  warning: createColorFn(hexToAnsi(palette.warningGlyph)),
  info: createColorFn(hexToAnsi(palette.brand)),
  number: (text: string | number) =>
    isColorEnabled() ? `${hexToAnsi(palette.brandStrong)}${String(text)}\x1b[0m` : String(text),
};

/**
 * Creates a formatted box for important messages
 */
function createBox(message: string, color: (text: string) => string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length));
  const width = Math.min(maxLength + 4, 80);

  const topBorder = '┌' + '─'.repeat(width - 2) + '┐';
  const bottomBorder = '└' + '─'.repeat(width - 2) + '┘';

  const boxedLines = [
    color(topBorder),
    ...lines.map((line) => color('│ ' + line.padEnd(width - 4) + ' │')),
    color(bottomBorder),
  ];

  return boxedLines.join('\n');
}

/**
 * ASCII art banner for Stati
 */
const STATI_ASCII_ART = [
  '███████╗████████╗ █████╗ ████████╗██╗',
  '██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║',
  '███████╗   ██║   ███████║   ██║   ██║',
  '╚════██║   ██║   ██╔══██║   ██║   ██║',
  '███████║   ██║   ██║  ██║   ██║   ██║',
  '╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝',
];

/**
 * Apply horizontal gradient to a line of text
 */
function applyHorizontalGradient(line: string): string {
  if (!isColorEnabled()) return line;

  const chars = [...line];
  const width = chars.length;
  if (width === 0) return line;

  return (
    chars
      .map((char, i) => {
        // Skip coloring whitespace
        if (char.trim() === '') return char;

        const t = i / width;
        let color: string;

        if (t < 0.33) {
          // Interpolate brandDim → brand
          const localT = t / 0.33;
          color = lerpColor(palette.brandDim, palette.brand, localT);
        } else if (t < 0.66) {
          // Hold at brand
          color = palette.brand;
        } else {
          // Interpolate brand → brandStrong
          const localT = (t - 0.66) / 0.34;
          color = lerpColor(palette.brand, palette.brandStrong, localT);
        }

        return `${hexToAnsi(color)}${char}`;
      })
      .join('') + '\x1b[0m'
  );
}

/**
 * Creates a decorative startup banner with ASCII art and horizontal gradient
 */
function createStartupBanner(cliVersion: string, coreVersion: string): string {
  const lines: string[] = [''];

  // Apply gradient to each ASCII art line
  for (const artLine of STATI_ASCII_ART) {
    lines.push(applyHorizontalGradient(artLine));
  }

  lines.push('');

  // Version line: package names in muted, versions in brand
  const versionLine = `${colors.muted('@stati/core')} ${colors.brand(`v${coreVersion}`)}  ${colors.muted('│')}  ${colors.muted('@stati/cli')} ${colors.brand(`v${cliVersion}`)}`;
  lines.push(versionLine);

  // Mode indicator removed - now shown in command info box
  lines.push('');

  return lines.join('\n');
}

/**
 * Option entry for command info box
 */
interface CommandOption {
  name: string;
  value: string | number | boolean;
  isDefault?: boolean;
}

/**
 * Creates a structured box showing command name and all options
 */
function createCommandInfoBox(command: string, options: CommandOption[] = []): string {
  if (!isColorEnabled()) {
    // Plain text fallback
    const lines = [`Command: ${command}`];
    for (const opt of options) {
      const defaultMark = opt.isDefault ? ' (default)' : '';
      lines.push(`  ${opt.name}: ${opt.value}${defaultMark}`);
    }
    return lines.join('\n');
  }

  // Calculate widths
  const commandLabel = 'Command';
  const maxNameLength = Math.max(commandLabel.length, ...options.map((opt) => opt.name.length));

  // Build content lines
  const contentLines: string[] = [];

  // Command row
  const commandName = command.charAt(0).toUpperCase() + command.slice(1);
  contentLines.push(
    `${colors.dim(commandLabel.padEnd(maxNameLength))}  ${colors.brand(commandName)}`,
  );

  // Options rows - show all options
  for (const opt of options) {
    let displayValue: string;

    if (typeof opt.value === 'boolean') {
      if (opt.value) {
        displayValue = opt.isDefault ? colors.dim('enabled') : colors.brandStrong('enabled');
      } else {
        displayValue = colors.faint('off');
      }
    } else if (typeof opt.value === 'string' && opt.value === '') {
      displayValue = colors.faint('–');
    } else {
      displayValue = opt.isDefault
        ? colors.dim(String(opt.value))
        : colors.brandStrong(String(opt.value));
    }

    contentLines.push(`${colors.dim(opt.name.padEnd(maxNameLength))}  ${displayValue}`);
  }

  // Calculate box width (strip ANSI for measurement)
  const maxContentWidth = Math.max(...contentLines.map((line) => stripAnsi(line).length));
  const boxWidth = Math.max(maxContentWidth + 4, 30);

  // Box drawing
  const topBorder = colors.faint('┌' + '─'.repeat(boxWidth - 2) + '┐');
  const bottomBorder = colors.faint('└' + '─'.repeat(boxWidth - 2) + '┘');

  const boxedLines = [
    topBorder,
    ...contentLines.map((line) => {
      const plainLength = stripAnsi(line).length;
      const padding = ' '.repeat(boxWidth - 4 - plainLength);
      return colors.faint('│') + ' ' + line + padding + ' ' + colors.faint('│');
    }),
    bottomBorder,
  ];

  return boxedLines.join('\n');
}

/**
 * Rendering tree node for visualizing build steps
 */
interface RenderingTreeNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'cached' | 'completed' | 'error';
  children?: RenderingTreeNode[];
  metadata?: {
    timing?: number;
    cacheHit?: boolean;
    url?: string;
    operation?: string;
  };
}

/**
 * Global rendering tree state for tracking build progress
 */
class RenderingTreeManager {
  private root: RenderingTreeNode | null = null;
  private nodeMap: Map<string, RenderingTreeNode> = new Map();

  createTree(label: string): string {
    this.root = {
      id: 'root',
      label,
      status: 'running',
      children: [],
    };
    this.nodeMap.set('root', this.root);
    return 'root';
  }

  addNode(
    parentId: string,
    id: string,
    label: string,
    status: RenderingTreeNode['status'] = 'pending',
    metadata?: RenderingTreeNode['metadata'],
  ): void {
    const parent = this.nodeMap.get(parentId);
    if (!parent) return;

    const node: RenderingTreeNode = {
      id,
      label,
      status,
      children: [],
      ...(metadata && { metadata }),
    };

    if (!parent.children) parent.children = [];
    parent.children.push(node);
    this.nodeMap.set(id, node);
  }

  updateNode(
    id: string,
    status: RenderingTreeNode['status'],
    metadata?: RenderingTreeNode['metadata'],
  ): void {
    const node = this.nodeMap.get(id);
    if (node) {
      node.status = status;
      if (metadata) {
        node.metadata = { ...node.metadata, ...metadata };
      }
    }
  }

  renderTree(): string {
    if (!this.root) return '';

    const lines: string[] = [];

    function renderNode(node: RenderingTreeNode, prefix = '', isLast = true, depth = 0): void {
      const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
      const statusIcon = getStatusIcon();
      const statusColor = getStatusColor(node.status);

      let line = `${prefix}${connector}${statusIcon}${statusColor(node.label)}`;

      // Add metadata if available
      if (node.metadata) {
        const metaParts: string[] = [];
        if (node.metadata.timing) {
          const time =
            node.metadata.timing < 1000
              ? `${node.metadata.timing}ms`
              : `${(node.metadata.timing / 1000).toFixed(2)}s`;
          metaParts.push(colors.timing(time));
        }
        if (node.metadata.cacheHit) {
          metaParts.push(colors.muted('(cached)'));
        }
        if (node.metadata.url) {
          metaParts.push(colors.muted(node.metadata.url));
        }
        if (metaParts.length > 0) {
          line += ` ${metaParts.join(' ')}`;
        }
      }

      lines.push(line);

      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (depth === 0 ? '' : isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
          const childIsLast = index === (node.children?.length ?? 0) - 1;
          renderNode(child, newPrefix, childIsLast, depth + 1);
        });
      }
    }

    function getStatusIcon(): string {
      // No icons needed - return empty string
      return '';
    }

    function getStatusColor(status: RenderingTreeNode['status']) {
      switch (status) {
        case 'pending':
          return colors.muted;
        case 'running':
          return colors.brand;
        case 'cached':
          return colors.brandStrong;
        case 'completed':
          return colors.brand;
        case 'error':
          return colors.errorGlyph;
        default:
          return colors.muted;
      }
    }

    renderNode(this.root);
    return lines.join('\n');
  }

  clear(): void {
    this.root = null;
    this.nodeMap.clear();
  }
}

// Global instance for managing the rendering tree
const renderingTree = new RenderingTreeManager();

/**
 * Tracked page data for progress and summary display
 */
interface TrackedPage {
  url: string;
  status: 'cached' | 'rendered' | 'error';
  timing?: number;
}

/**
 * Progress bar manager for live build progress display
 * Shows a progress bar with counts and current page during builds,
 * then displays a grouped summary with slowest pages after completion.
 */
class ProgressBarManager {
  private totalPages = 0;
  private cachedCount = 0;
  private renderedCount = 0;
  private errorCount = 0;
  private currentUrl = '';
  private pages: TrackedPage[] = [];
  private isActive = false;
  private linesWritten = 0;
  private startTime = 0;

  /**
   * Start progress tracking
   */
  start(total: number): void {
    this.totalPages = total;
    this.cachedCount = 0;
    this.renderedCount = 0;
    this.errorCount = 0;
    this.currentUrl = '';
    this.pages = [];
    this.isActive = true;
    this.linesWritten = 0;
    this.startTime = performance.now();

    // Show initial progress
    this.render();
  }

  /**
   * Update progress with a page result
   */
  update(status: 'cached' | 'rendered' | 'error', url: string, timing?: number): void {
    if (!this.isActive) return;

    // Update counts
    if (status === 'cached') {
      this.cachedCount++;
    } else if (status === 'rendered') {
      this.renderedCount++;
    } else {
      this.errorCount++;
    }

    this.currentUrl = url;

    // Track rendered pages for slowest page summary
    if (status === 'rendered' && timing !== undefined) {
      this.pages.push({ url, status, timing });
    }

    // Re-render progress display
    this.render();
  }

  /**
   * End progress tracking
   */
  end(): void {
    if (!this.isActive) return;
    this.isActive = false;

    // Clear the progress display (move up and clear lines)
    // Only write ANSI escape codes if output is a TTY to avoid garbled output in CI/piped environments
    if (this.linesWritten > 0 && process.stdout.isTTY) {
      // Move cursor up and clear each line
      process.stdout.write(`\x1b[${this.linesWritten}A`);
      for (let i = 0; i < this.linesWritten; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      // Move back up to where we started
      process.stdout.write(`\x1b[${this.linesWritten}A`);
    }
  }

  /**
   * Get summary data for display
   */
  getSummary(): {
    totalPages: number;
    cachedCount: number;
    renderedCount: number;
    errorCount: number;
    slowestPages: TrackedPage[];
    totalTimeMs: number;
    avgRenderTimeMs: number;
    cacheHitRate: number;
  } {
    // Sort pages by timing (descending) and take top 5
    const slowestPages = [...this.pages]
      .filter((p) => p.timing !== undefined)
      .sort((a, b) => (b.timing ?? 0) - (a.timing ?? 0))
      .slice(0, 5);

    // Calculate average render time
    const renderTimes = this.pages.filter((p) => p.timing !== undefined).map((p) => p.timing ?? 0);
    const avgRenderTimeMs =
      renderTimes.length > 0
        ? Math.round(renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length)
        : 0;

    // Calculate cache hit rate
    const total = this.cachedCount + this.renderedCount + this.errorCount;
    const cacheHitRate = total > 0 ? Math.round((this.cachedCount / total) * 100) : 0;

    return {
      totalPages: this.totalPages,
      cachedCount: this.cachedCount,
      renderedCount: this.renderedCount,
      errorCount: this.errorCount,
      slowestPages,
      totalTimeMs: Math.round(performance.now() - this.startTime),
      avgRenderTimeMs,
      cacheHitRate,
    };
  }

  /**
   * Render the progress display
   */
  private render(): void {
    // Clear previous output if any
    // Only write ANSI escape codes if output is a TTY to avoid garbled output in CI/piped environments
    if (this.linesWritten > 0 && process.stdout.isTTY) {
      process.stdout.write(`\x1b[${this.linesWritten}A`);
    }

    const processed = this.cachedCount + this.renderedCount + this.errorCount;
    const percentage = this.totalPages > 0 ? Math.floor((processed / this.totalPages) * 100) : 0;

    // Build progress bar (40 chars wide)
    const barWidth = 40;
    const filled = Math.floor((processed / this.totalPages) * barWidth);
    const empty = barWidth - filled;
    const bar = colors.brand('█'.repeat(filled)) + colors.faint('░'.repeat(empty));

    // Format counts
    const cachedText =
      this.cachedCount > 0
        ? colors.brandStrong(`${getGlyph('success')} ${this.cachedCount} cached`)
        : '';
    const renderedText =
      this.renderedCount > 0
        ? colors.brand(`${getGlyph('bullet')} ${this.renderedCount} rendered`)
        : '';
    const errorText =
      this.errorCount > 0
        ? colors.errorGlyph(`${getGlyph('error')} ${this.errorCount} errors`)
        : '';

    // Build counts line
    const counts = [cachedText, renderedText, errorText].filter(Boolean).join('    ');

    // Truncate URL if too long
    const maxUrlLength = 50;
    const displayUrl =
      this.currentUrl.length > maxUrlLength
        ? '...' + this.currentUrl.slice(-(maxUrlLength - 3))
        : this.currentUrl;

    // Build output lines
    const lines: string[] = [
      colors.brand('  Rendering pages...'),
      `  [${bar}] ${colors.brandStrong(percentage + '%')} ${colors.muted(`(${processed}/${this.totalPages})`)}`,
      `  ${counts || colors.muted('Starting...')}`,
      `  ${colors.muted(getGlyph('arrow'))} ${colors.dim(displayUrl || 'Initializing...')}`,
      '', // Empty line for spacing
    ];

    // Write output
    console.log(lines.join('\n'));
    this.linesWritten = lines.length;
  }

  /**
   * Render the final summary
   */
  renderSummary(): void {
    const summary = this.getSummary();
    const lines: string[] = [];

    // Calculate bar proportions for cached vs rendered
    const total = summary.cachedCount + summary.renderedCount;
    const barWidth = 20;

    // Cached line with bar
    if (summary.cachedCount > 0) {
      const cachedBar = colors.faint('░'.repeat(barWidth));
      lines.push(
        `  ${colors.muted('Cached')}      ${colors.brandStrong(String(summary.cachedCount).padStart(4))} pages   ${cachedBar} ${colors.muted('(skipped)')}`,
      );
    }

    // Rendered line with bar and avg time
    if (summary.renderedCount > 0) {
      const renderedBarLen = Math.min(
        barWidth,
        Math.ceil((summary.renderedCount / total) * barWidth),
      );
      const renderedBar = colors.brand('█'.repeat(renderedBarLen));
      const avgTime =
        summary.avgRenderTimeMs < 1000
          ? `${summary.avgRenderTimeMs}ms`
          : `${(summary.avgRenderTimeMs / 1000).toFixed(2)}s`;
      lines.push(
        `  ${colors.muted('Rendered')}    ${colors.brand(String(summary.renderedCount).padStart(4))} pages   ${renderedBar.padEnd(barWidth)} ${colors.muted('avg ' + avgTime)}`,
      );
    }

    // Errors line
    if (summary.errorCount > 0) {
      lines.push(
        `  ${colors.errorGlyph('Errors')}      ${colors.errorGlyph(String(summary.errorCount).padStart(4))} pages`,
      );
    }

    // Slowest pages (only if we have rendered pages)
    if (summary.slowestPages.length > 0) {
      lines.push('');
      lines.push(`  ${colors.muted('Slowest pages:')}`);
      for (const page of summary.slowestPages) {
        const time = page.timing ?? 0;
        const timeStr = time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
        lines.push(
          `    ${colors.muted(getGlyph('arrow'))} ${colors.timing(timeStr.padStart(7))}   ${colors.dim(page.url)}`,
        );
      }
    }

    // Total line
    lines.push('');
    const totalTime =
      summary.totalTimeMs < 1000
        ? `${summary.totalTimeMs}ms`
        : `${(summary.totalTimeMs / 1000).toFixed(1)}s`;
    lines.push(
      `  ${colors.muted('Total:')} ${colors.brandStrong(String(summary.totalPages))} pages in ${colors.brandStrong(totalTime)}  ${colors.faint('│')}  ${colors.muted('Cache hit rate:')} ${colors.brand(summary.cacheHitRate + '%')}`,
    );

    console.log(lines.join('\n'));
  }

  /**
   * Reset state
   */
  clear(): void {
    this.totalPages = 0;
    this.cachedCount = 0;
    this.renderedCount = 0;
    this.errorCount = 0;
    this.currentUrl = '';
    this.pages = [];
    this.isActive = false;
    this.linesWritten = 0;
  }
}

// Global instance for managing the progress bar
const progressBar = new ProgressBarManager();

/**
 * Creates formatted build statistics without using a table
 */
function createStatsTable(stats: {
  totalPages: number;
  assetsCount: number;
  buildTimeMs: number;
  outputSizeBytes: number;
  cacheHits?: number;
  cacheMisses?: number;
}): string {
  const sizeKB = (stats.outputSizeBytes / 1024).toFixed(1);
  const timeSeconds = (stats.buildTimeMs / 1000).toFixed(2);

  // Create formatted lines for statistics
  const lines: string[] = [];

  // Header
  lines.push(colors.brand('Build Statistics'));

  // Build statistics
  lines.push(`${colors.muted('  Build time:')} ${colors.brandStrong(timeSeconds)}s`);
  lines.push(`${colors.muted('  Pages built:')} ${colors.brandStrong(String(stats.totalPages))}`);
  lines.push(
    `${colors.muted('  Assets copied:')} ${colors.brandStrong(String(stats.assetsCount))}`,
  );
  lines.push(`${colors.muted('  Output size:')} ${colors.brandStrong(sizeKB)} KB`);

  // Add cache statistics if available
  if (stats.cacheHits !== undefined && stats.cacheMisses !== undefined) {
    const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? ((stats.cacheHits / totalCacheRequests) * 100).toFixed(1) : '0';
    lines.push(
      `${colors.muted('  Cache hits:')} ${colors.brandStrong(String(stats.cacheHits))}/${colors.brandStrong(String(totalCacheRequests))} (${colors.brand(hitRate + '%')})`,
    );
  }

  return lines.join('\n');
}

/**
 * Formatted log functions for common CLI output patterns
 */
export const log = {
  /**
   * Success message with checkmark glyph
   */
  success: (message: string) => {
    console.log(colors.successGlyph(getGlyph('success')) + ' ' + message);
  },

  /**
   * Error message with cross glyph
   */
  error: (message: string) => {
    console.error(colors.errorGlyph(getGlyph('error')) + ' ' + message);
  },

  /**
   * Warning message with warning glyph
   */
  warning: (message: string) => {
    console.warn(colors.warningGlyph(getGlyph('warning')) + ' ' + message);
  },

  /**
   * Info message
   */
  info: (message: string) => {
    console.log(colors.brand(message));
  },

  /**
   * Building progress message
   */
  building: (message: string) => {
    console.log(colors.brand(message));
  },

  /**
   * File processing message
   */
  processing: (message: string) => {
    console.log(colors.muted(`  ${getGlyph('continuation')} ${message}`));
  },

  /**
   * Statistics or numbers
   */
  stats: (message: string) => {
    console.log(colors.brandStrong(message));
  },

  /**
   * Build statistics as formatted text
   */
  statsTable: (stats: {
    totalPages: number;
    assetsCount: number;
    buildTimeMs: number;
    outputSizeBytes: number;
    cacheHits?: number;
    cacheMisses?: number;
  }) => {
    console.log(createStatsTable(stats));
  },

  /**
   * Header message in a box
   */
  header: (message: string) => {
    console.log('\n' + createBox(message, colors.brand) + '\n');
  },

  /**
   * Decorative startup banner for CLI commands
   */
  startupBanner: (
    _mode: 'Development Server' | 'Preview Server' | 'Build',
    cliVersion: string,
    coreVersion: string,
  ) => {
    console.log('\n' + createStartupBanner(cliVersion, coreVersion));
  },

  /**
   * Display command info box with options
   */
  commandInfo: (
    command: string,
    options: Array<{ name: string; value: string | number | boolean; isDefault?: boolean }> = [],
  ) => {
    console.log(createCommandInfoBox(command, options) + '\n');
  },

  /**
   * Initialize a rendering tree for build process visualization
   */
  startRenderingTree: (label: string) => {
    renderingTree.createTree(label);
  },

  /**
   * Add a step to the rendering tree
   */
  addTreeNode: (
    parentId: string,
    id: string,
    label: string,
    status: 'pending' | 'running' | 'cached' | 'completed' | 'error' = 'pending',
    metadata?: { timing?: number; cacheHit?: boolean; url?: string; operation?: string },
  ) => {
    renderingTree.addNode(parentId, id, label, status, metadata);
  },

  /**
   * Update a node in the rendering tree
   */
  updateTreeNode: (
    id: string,
    status: 'pending' | 'running' | 'cached' | 'completed' | 'error',
    metadata?: { timing?: number; cacheHit?: boolean; url?: string; operation?: string },
  ) => {
    renderingTree.updateNode(id, status, metadata);
  },

  /**
   * Render and display the current tree
   */
  showRenderingTree: () => {
    const tree = renderingTree.renderTree();
    if (tree) {
      console.log(tree);
    }
  },

  /**
   * Clear the rendering tree
   */
  clearRenderingTree: () => {
    renderingTree.clear();
  },

  /**
   * Initialize progress tracking for page rendering
   * Shows a live progress bar during build
   */
  startProgress: (totalPages: number) => {
    progressBar.start(totalPages);
  },

  /**
   * Update progress during page rendering
   */
  updateProgress: (status: 'cached' | 'rendered' | 'error', url: string, timing?: number) => {
    progressBar.update(status, url, timing);
  },

  /**
   * End progress tracking and clear the display
   */
  endProgress: () => {
    progressBar.end();
  },

  /**
   * Display a summary of the rendering process
   */
  showRenderingSummary: () => {
    progressBar.renderSummary();
  },

  /**
   * Step message with arrow
   */
  step: (step: number, total: number, message: string) => {
    const stepIndicator = colors.brand(`[${step}/${total}]`);
    console.log(`${stepIndicator} ${colors.bold(message)}`);
  },

  /**
   * Progress with rendering tree instead of bar
   */
  progress: (current: number, total: number, message: string) => {
    // For backwards compatibility, we'll show progress as tree updates
    // This will be replaced by specific tree node updates in the build process
    const percentage = Math.floor((current / total) * 100);
    console.log(
      `  ${colors.brandStrong(`[${current}/${total}]`)} ${colors.muted(`${percentage}% ${message}`)}`,
    );
  },

  /**
   * File operation with proper styling
   */
  file: (operation: string, path: string) => {
    const glyph =
      operation === 'copy'
        ? getGlyph('fileCopy')
        : operation === 'create'
          ? getGlyph('fileCreate')
          : getGlyph('fileUpdate');
    console.log(colors.muted(`  ${glyph} ${operation} ${colors.file(path)}`));
  },

  /**
   * URL with proper styling
   */
  url: (label: string, url: string) => {
    console.log(`  ${label}: ${colors.url(url)}`);
  },

  /**
   * Timing information
   */
  timing: (operation: string, duration: number) => {
    const time = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    console.log(colors.dim(`${operation} completed in `) + colors.brandStrong(time));
  },

  /**
   * Draw navigation tree structure (limited to ~100 lines, truncating folder contents)
   */
  navigationTree: (
    navigation: Array<{
      title: string;
      url: string;
      isCollection?: boolean;
      children?: Array<{ title: string; url: string }>;
    }>,
  ) => {
    const MAX_LINES = 100;
    let lineCount = 0;

    console.log(); // Add spacing before
    console.log(colors.brand('Site Structure:'));
    lineCount += 2;

    interface TreeNode {
      title: string;
      url: string;
      isCollection?: boolean;
      children?: TreeNode[];
    }

    // First pass: count total lines needed to determine if truncation is required
    function countLines(nodes: TreeNode[]): number {
      let count = 0;
      for (const node of nodes) {
        count += 1; // The node itself
        if (node.children && node.children.length > 0) {
          count += countLines(node.children);
        }
      }
      return count;
    }

    const totalLines = countLines(navigation);
    const needsTruncation = totalLines + lineCount > MAX_LINES;

    // Calculate max children per folder if truncation needed
    // Reserve lines for: folders + "...and N more" markers
    // SAFEGUARD: This ensures all folders are always displayed, with at least 3 children each.
    // The algorithm prioritizes showing folder structure over showing all children.
    function calculateMaxChildrenPerFolder(): number {
      if (!needsTruncation) return Infinity;

      // Count folders (nodes with children)
      let folderCount = 0;
      function countFolders(nodes: TreeNode[]) {
        for (const node of nodes) {
          if (node.children && node.children.length > 0) {
            folderCount++;
            countFolders(node.children);
          }
        }
      }
      countFolders(navigation);

      // Available lines for children (after accounting for folders and potential truncation markers)
      // We reserve folderCount * 2 to account for both folder lines and their "...and N more" markers
      // Additional buffer of 2 lines ensures final truncation notice can always be shown
      const truncationBuffer = 2;
      const availableForChildren =
        MAX_LINES - lineCount - navigation.length - folderCount * 2 - truncationBuffer;
      if (folderCount === 0) return Infinity;

      // Distribute evenly, minimum 3 items per folder to ensure meaningful display
      // Even in deeply nested trees, each folder will show at least 3 children
      const calculated = Math.floor(availableForChildren / Math.max(1, folderCount));
      return Math.max(3, calculated);
    }

    const maxChildrenPerFolder = calculateMaxChildrenPerFolder();

    function drawNode(node: TreeNode, depth = 0, isLast = true, prefix = '') {
      if (lineCount >= MAX_LINES) return;

      const connector = isLast ? '└── ' : '├── ';
      const title = colors.file(node.title);
      const url = colors.muted(`(${node.url})`);

      console.log(`${prefix}${connector}${title} ${url}`);
      lineCount++;

      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        const childCount = node.children.length;
        const showCount = Math.min(childCount, maxChildrenPerFolder);
        const hiddenCount = childCount - showCount;

        node.children.slice(0, showCount).forEach((child, index) => {
          if (lineCount >= MAX_LINES) return;
          const childIsLast = index === showCount - 1 && hiddenCount === 0;
          drawNode(child, depth + 1, childIsLast, newPrefix);
        });

        // Show truncation marker if items were hidden
        if (hiddenCount > 0 && lineCount < MAX_LINES) {
          const truncConnector = '└── ';
          console.log(
            `${newPrefix}${truncConnector}${colors.dim(`...and ${hiddenCount} more item${hiddenCount === 1 ? '' : 's'}`)}`,
          );
          lineCount++;
        }
      }
    }

    navigation.forEach((node, index) => {
      if (lineCount >= MAX_LINES) return;
      const isLast = index === navigation.length - 1;
      drawNode(node, 0, isLast);
    });

    // Final truncation notice if we hit the limit
    if (lineCount >= MAX_LINES && totalLines + 2 > MAX_LINES) {
      console.log(colors.dim(`  (output truncated, ${totalLines + 2 - lineCount} more lines)`));
    }
  },
};
