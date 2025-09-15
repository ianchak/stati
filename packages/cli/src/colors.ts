/**
 * Professional color utilities for CLI output
 * Uses custom ANSI escape codes for consistent cross-platform colors
 */
export const colors = {
  /**
   * Success messages - muted forest green
   */
  success: (text: string) => `\x1b[38;2;22;163;74m${text}\x1b[0m`, // #16a34a

  /**
   * Error messages - muted red
   */
  error: (text: string) => `\x1b[38;2;220;38;38m${text}\x1b[0m`, // #dc2626

  /**
   * Warning messages - muted amber
   */
  warning: (text: string) => `\x1b[38;2;217;119;6m${text}\x1b[0m`, // #d97706

  /**
   * Info messages - muted steel blue
   */
  info: (text: string) => `\x1b[38;2;37;99;235m${text}\x1b[0m`, // #2563eb

  /**
   * Highlight text - muted teal
   */
  highlight: (text: string) => `\x1b[38;2;8;145;178m${text}\x1b[0m`, // #0891b2

  /**
   * Muted text - warm gray
   */
  muted: (text: string) => `\x1b[38;2;107;114;128m${text}\x1b[0m`, // #6b7280

  /**
   * Bold text
   */
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,

  /**
   * Numbers and statistics - muted purple
   */
  number: (text: string | number) => `\x1b[38;2;124;58;237m${String(text)}\x1b[0m`, // #7c3aed

  /**
   * Brand colors - sophisticated palette
   */
  brand: (text: string) => `\x1b[38;2;79;70;229m${text}\x1b[0m`, // #4f46e5 - Professional indigo
  secondary: (text: string) => `\x1b[38;2;124;58;237m${text}\x1b[0m`, // #7c3aed - Muted purple
  accent: (text: string) => `\x1b[38;2;8;145;178m${text}\x1b[0m`, // #0891b2 - Muted teal

  /**
   * File types - professional slate colors
   */
  file: (text: string) => `\x1b[38;2;100;116;139m${text}\x1b[0m`, // #64748b
  folder: (text: string) => `\x1b[38;2;71;85;105m${text}\x1b[0m`, // #475569
  url: (text: string) => `\x1b[4m\x1b[38;2;8;145;178m${text}\x1b[0m`, // #0891b2 underlined

  /**
   * Status indicators - muted colors
   */
  progress: (text: string) => `\x1b[38;2;217;119;6m${text}\x1b[0m`, // #d97706
  timing: (text: string) => `\x1b[38;2;156;163;175m${text}\x1b[0m`, // #9ca3af
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
          return colors.info;
        case 'cached':
          return colors.warning;
        case 'completed':
          return colors.success;
        case 'error':
          return colors.error;
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
  lines.push(`${colors.muted('  Build time:')} ${colors.number(timeSeconds)}s`);
  lines.push(`${colors.muted('  Pages built:')} ${colors.number(stats.totalPages)}`);
  lines.push(`${colors.muted('  Assets copied:')} ${colors.number(stats.assetsCount)}`);
  lines.push(`${colors.muted('  Output size:')} ${colors.number(sizeKB)} KB`);

  // Add cache statistics if available
  if (stats.cacheHits !== undefined && stats.cacheMisses !== undefined) {
    const totalCacheRequests = stats.cacheHits + stats.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? ((stats.cacheHits / totalCacheRequests) * 100).toFixed(1) : '0';
    lines.push(
      `${colors.muted('  Cache hits:')} ${colors.number(stats.cacheHits)}/${colors.number(totalCacheRequests)} (${colors.highlight(hitRate + '%')})`,
    );
  }

  return lines.join('\n');
}

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
    console.log(colors.brand(message));
  },

  /**
   * File processing message
   */
  processing: (message: string) => {
    console.log(colors.muted('  ↳ ' + message));
  },

  /**
   * Statistics or numbers
   */
  stats: (message: string) => {
    console.log(colors.highlight(message));
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
    console.log(colors.muted(`  [${current}/${total}] ${percentage}% ${message}`));
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
    console.log(`  ${label}: ${colors.url(url)}`);
  },

  /**
   * Timing information
   */
  timing: (operation: string, duration: number) => {
    const time = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
    console.log(colors.timing(`${operation} completed in ${colors.number(time)}`));
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
  },
};
