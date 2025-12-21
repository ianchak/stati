/**
 * Logging related type definitions
 */

/**
 * Logger interface for customizing build output and visualization.
 * Provides comprehensive logging capabilities including basic log levels, build progress tracking,
 * file operations, statistics display, and advanced tree-based rendering visualization.
 *
 * Core Methods (Required):
 * - Basic logging: info, success, warning, error
 * - Build progress: building, processing, stats
 *
 * Enhanced Methods (Optional):
 * - Visual formatting: header, step, progress, divider
 * - File operations: file, url, timing
 * - Statistics: statsTable, navigationTree
 * - Tree visualization: startRenderingTree, addTreeNode, updateTreeNode, showRenderingTree, clearRenderingTree
 *
 * @example Basic Logger Implementation
 * ```typescript
 * const basicLogger: Logger = {
 *   info: (msg) => console.log('\x1b[38;2;56;189;248m• ' + msg + '\x1b[0m'),
 *   success: (msg) => console.log('\x1b[38;2;34;197;94m✓ ' + msg + '\x1b[0m'),
 *   warning: (msg) => console.warn('\x1b[38;2;245;158;11m! ' + msg + '\x1b[0m'),
 *   error: (msg) => console.error('\x1b[38;2;239;68;68m× ' + msg + '\x1b[0m'),
 *   building: (msg) => console.log('\x1b[38;2;56;189;248m' + msg + '\x1b[0m'),
 *   processing: (msg) => console.log('\x1b[38;2;148;163;184m  ' + msg + '\x1b[0m'),
 *   stats: (msg) => console.log('\x1b[38;2;186;230;253m• ' + msg + '\x1b[0m')
 * };
 * ```
 *
 * @example Enhanced Logger with Tree Visualization
 * ```typescript
 * const enhancedLogger: Logger = {
 *   // ... basic methods ...
 *   header: (msg) => console.log(boxedMessage(msg)),
 *   step: (step, total, msg) => console.log(`[${step}/${total}] ${msg}`),
 *   progress: (current, total, msg) => console.log(progressBar(current, total) + ' ' + msg),
 *   file: (op, path) => console.log(`  + ${op} ${path}`),
 *   url: (label, url) => console.log(`  ${label}: ${url}`),
 *   timing: (op, duration) => console.log(`  ${op} completed in ${duration}ms`),
 *   divider: (title) => console.log('─'.repeat(50) + ' ' + title),
 *   statsTable: (stats) => displayStatsTable(stats),
 *   startRenderingTree: (label) => initTree(label),
 *   addTreeNode: (parentId, id, label, status, metadata) => addNode(parentId, id, label, status, metadata),
 *   updateTreeNode: (id, status, metadata) => updateNode(id, status, metadata),
 *   showRenderingTree: () => renderTree(),
 *   clearRenderingTree: () => clearTree()
 * };
 * ```
 */
export interface Logger {
  /** Log informational messages */
  info: (message: string) => void;
  /** Log success messages */
  success: (message: string) => void;
  /** Log warning messages */
  warning: (message: string) => void;
  /** Log error messages */
  error: (message: string) => void;
  /** Log build progress messages */
  building: (message: string) => void;
  /** Log file processing messages */
  processing: (message: string) => void;
  /** Log statistics and metrics */
  stats: (message: string) => void;
  /** Display a header message in a box (optional) */
  header?: (message: string) => void;
  /** Display a step indicator (optional) */
  step?: (step: number, total: number, message: string) => void;
  /** Display progress with a bar (optional) */
  progress?: (current: number, total: number, message: string) => void;
  /** Log file operations (optional) */
  file?: (operation: string, path: string, sizeInBytes?: number) => void;
  /** Log URLs with proper styling (optional) */
  url?: (label: string, url: string) => void;
  /** Log timing information (optional) */
  timing?: (operation: string, duration: number) => void;
  /** Display a section divider (optional) */
  divider?: (title?: string) => void;
  /** Display build statistics as a table (optional) */
  statsTable?: (stats: {
    totalPages: number;
    assetsCount: number;
    buildTimeMs: number;
    outputSizeBytes: number;
    cacheHits?: number;
    cacheMisses?: number;
  }) => void;
  /** Display navigation tree structure (optional) */
  navigationTree?: (navigation: import('./navigation.js').NavNode[]) => void;
  /** Initialize a rendering tree for build process visualization (optional) */
  startRenderingTree?: (label: string) => void;
  /** Add a step to the rendering tree (optional) */
  addTreeNode?: (
    parentId: string,
    id: string,
    label: string,
    status?: 'pending' | 'running' | 'cached' | 'completed' | 'error',
    metadata?: { timing?: number; cacheHit?: boolean; url?: string; operation?: string },
  ) => void;
  /** Update a node in the rendering tree (optional) */
  updateTreeNode?: (
    id: string,
    status: 'pending' | 'running' | 'cached' | 'completed' | 'error',
    metadata?: { timing?: number; cacheHit?: boolean; url?: string; operation?: string },
  ) => void;
  /** Render and display the current tree (optional) */
  showRenderingTree?: () => void;
  /** Clear the rendering tree (optional) */
  clearRenderingTree?: () => void;

  // Progress Bar + Summary System (preferred over rendering tree for large sites)

  /** Initialize progress tracking for page rendering (optional) */
  startProgress?: (totalPages: number) => void;
  /**
   * Update progress during page rendering (optional)
   * @param status - 'cached' | 'rendered' | 'error'
   * @param url - The URL of the page being processed
   * @param timing - Render time in milliseconds (for rendered pages)
   */
  updateProgress?: (status: 'cached' | 'rendered' | 'error', url: string, timing?: number) => void;
  /** End progress tracking and prepare for summary (optional) */
  endProgress?: () => void;
  /**
   * Display a summary of the rendering process (optional)
   * Shows cached/rendered counts, slowest pages, and cache hit rate
   */
  showRenderingSummary?: () => void;
}
