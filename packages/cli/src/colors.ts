import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import Table from 'cli-table3';

/**
 * Color utilities for CLI output
 */
export const colors = {
  /**
   * Success messages - green
   */
  success: (text: string) => chalk.green(text),

  /**
   * Error messages - red
   */
  error: (text: string) => chalk.red(text),

  /**
   * Warning messages - yellow
   */
  warning: (text: string) => chalk.yellow(text),

  /**
   * Info messages - blue
   */
  info: (text: string) => chalk.blue(text),

  /**
   * Highlight text - cyan
   */
  highlight: (text: string) => chalk.cyan(text),

  /**
   * Muted text - gray
   */
  muted: (text: string) => chalk.gray(text),

  /**
   * Bold text
   */
  bold: (text: string) => chalk.bold(text),

  /**
   * Numbers and statistics - magenta
   */
  number: (text: string | number) => chalk.magenta(String(text)),

  /**
   * Brand colors
   */
  brand: (text: string) => chalk.hex('#6366f1')(text), // Indigo
  secondary: (text: string) => chalk.hex('#8b5cf6')(text), // Purple
  accent: (text: string) => chalk.hex('#06b6d4')(text), // Cyan

  /**
   * File types
   */
  file: (text: string) => chalk.cyan(text),
  folder: (text: string) => chalk.blue(text),
  url: (text: string) => chalk.underline.cyan(text),

  /**
   * Status indicators
   */
  progress: (text: string) => chalk.yellow(text),
  timing: (text: string) => chalk.gray(text),
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
 * Creates a progress bar representation
 */
function createProgressBar(current: number, total: number, width: number = 20): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = Math.floor(percentage * 100);

  return `${colors.progress('[')}${colors.accent(bar)}${colors.progress(']')} ${colors.number(percent + '%')}`;
}

/**
 * Creates a formatted table for build statistics
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

  const table = new Table({
    colWidths: [20, 12],
    style: {
      head: [],
      border: ['cyan'],
      'padding-left': 1,
      'padding-right': 1,
    },
  });

  // Add the header as a spanning row
  table.push([{ content: colors.brand('📊 Build Statistics'), colSpan: 2 }] as [
    { content: string; colSpan: number },
  ]);

  // Add rows to the table (without colors first)
  table.push(
    ['Build time', `${timeSeconds}s`],
    ['Pages built', stats.totalPages.toString()],
    ['Assets copied', stats.assetsCount.toString()],
    ['Output size', `${sizeKB} KB`],
  );

  // Add cache statistics if available
  if (stats.cacheHits !== undefined && stats.cacheMisses !== undefined) {
    const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? ((stats.cacheHits / totalCacheRequests) * 100).toFixed(1) : '0';
    table.push(['Cache hits', `${stats.cacheHits}/${totalCacheRequests} (${hitRate}%)`]);
  }

  return table.toString();
}

/**
 * Spinner utilities for long-running operations
 */
export const spinner = {
  /**
   * Create a spinner for building operations
   */
  building: (text: string): Ora => {
    return ora({
      text: colors.brand(text),
      spinner: 'dots',
      color: 'cyan',
    });
  },

  /**
   * Create a spinner for processing operations
   */
  processing: (text: string): Ora => {
    return ora({
      text: colors.info(text),
      spinner: 'line',
      color: 'blue',
    });
  },

  /**
   * Create a spinner for copying files
   */
  copying: (text: string): Ora => {
    return ora({
      text: colors.muted(text),
      spinner: 'simpleDotsScrolling',
      color: 'gray',
    });
  },

  /**
   * Create a generic success spinner
   */
  success: (text: string): Ora => {
    return ora({
      text: colors.success(text),
      spinner: 'star',
      color: 'green',
    });
  },

  /**
   * Create a generic error spinner
   */
  error: (text: string): Ora => {
    return ora({
      text: colors.error(text),
      spinner: 'dots',
      color: 'red',
    });
  },
};

/**
 * Formatted log functions for common CLI output patterns
 */
export const log = {
  /**
   * Success message with checkmark
   */
  success: (message: string) => {
    console.log(colors.success('✅ ' + message));
  },

  /**
   * Error message with cross
   */
  error: (message: string) => {
    console.error(colors.error('❌ ' + message));
  },

  /**
   * Warning message with warning sign
   */
  warning: (message: string) => {
    console.warn(colors.warning('⚠️  ' + message));
  },

  /**
   * Info message with info icon
   */
  info: (message: string) => {
    console.log(colors.info(message));
  },

  /**
   * Building progress message
   */
  building: (message: string) => {
    console.log(colors.brand('🏗️  ' + message));
  },

  /**
   * File processing message
   */
  processing: (message: string) => {
    console.log(colors.muted('  ↳ ' + message));
  },

  /**
   * Statistics or numbers - can display as table or text
   */
  stats: (message: string) => {
    console.log(colors.highlight(message));
  },

  /**
   * Build statistics as a formatted table
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
   * Step message with arrow
   */
  step: (step: number, total: number, message: string) => {
    const stepIndicator = colors.brand(`[${step}/${total}]`);
    console.log(`${stepIndicator} ${colors.bold(message)}`);
  },

  /**
   * Progress with bar
   */
  progress: (current: number, total: number, message: string) => {
    const bar = createProgressBar(current, total);
    console.log(`  ${bar} ${colors.muted(message)}`);
  },

  /**
   * File operation with proper styling
   */
  file: (operation: string, path: string) => {
    const icon = operation === 'copy' ? '📄' : operation === 'create' ? '✨' : '📝';
    console.log(colors.muted(`  ${icon} ${operation} ${colors.file(path)}`));
  },

  /**
   * URL with proper styling
   */
  url: (label: string, url: string) => {
    console.log(`  ${colors.info('🔗')} ${label}: ${colors.url(url)}`);
  },

  /**
   * Timing information
   */
  timing: (operation: string, duration: number) => {
    const time = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    console.log(colors.timing(`⏱️  ${operation} completed in ${colors.number(time)}`));
  },

  /**
   * Start a spinner for a long-running operation
   */
  startSpinner: (text: string, type: 'building' | 'processing' | 'copying' = 'processing'): Ora => {
    return spinner[type](text).start();
  },

  /**
   * Stop a spinner with success
   */
  succeedSpinner: (spinner: Ora, text?: string) => {
    spinner.succeed(text ? colors.success('✅ ' + text) : undefined);
  },

  /**
   * Stop a spinner with failure
   */
  failSpinner: (spinner: Ora, text?: string) => {
    spinner.fail(text ? colors.error('❌ ' + text) : undefined);
  },

  /**
   * Update spinner text
   */
  updateSpinner: (spinner: Ora, text: string) => {
    spinner.text = colors.info(text);
  },

  /**
   * Draw navigation tree structure
   */
  navigationTree: (
    navigation: Array<{
      title: string;
      url: string;
      isCollection?: boolean;
      children?: Array<{ title: string; url: string }>;
    }>,
  ) => {
    console.log(); // Add spacing before
    console.log(colors.info('📁 Site Structure:'));

    interface TreeNode {
      title: string;
      url: string;
      isCollection?: boolean;
      children?: TreeNode[];
    }

    function drawNode(node: TreeNode, depth = 0, isLast = true, prefix = '') {
      const connector = isLast ? '└── ' : '├── ';
      const icon = node.isCollection ? '📁' : '📄';
      const title = colors.file(node.title);
      const url = colors.muted(`(${node.url})`);

      console.log(`${prefix}${connector}${icon} ${title} ${url}`);

      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        node.children.forEach((child, index) => {
          const childIsLast = index === (node.children?.length ?? 0) - 1;
          drawNode(child, depth + 1, childIsLast, newPrefix);
        });
      }
    }

    navigation.forEach((node, index) => {
      const isLast = index === navigation.length - 1;
      drawNode(node, 0, isLast);
    });
    console.log(); // Add spacing after
  },
};
