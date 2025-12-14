import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, colors } from '../src/colors.js';

describe('colors', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('colors object', () => {
    it('should have all required color methods', () => {
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('info');
      expect(colors).toHaveProperty('highlight');
      expect(colors).toHaveProperty('muted');
      expect(colors).toHaveProperty('bold');
      expect(colors).toHaveProperty('number');
      expect(colors).toHaveProperty('brand');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('accent');
      expect(colors).toHaveProperty('file');
      expect(colors).toHaveProperty('folder');
      expect(colors).toHaveProperty('url');
      expect(colors).toHaveProperty('progress');
      expect(colors).toHaveProperty('timing');
    });

    it('should apply ANSI escape codes to text', () => {
      const result = colors.success('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
      expect(result).toContain('\x1b[0m');
    });

    it('should format numbers correctly', () => {
      const result = colors.number(42);
      expect(result).toContain('42');
      expect(result).toContain('\x1b[');
    });

    it('should apply bold formatting', () => {
      const result = colors.bold('bold text');
      expect(result).toContain('\x1b[1m');
      expect(result).toContain('bold text');
    });

    it('should apply underline to URLs', () => {
      const result = colors.url('http://localhost');
      expect(result).toContain('\x1b[4m');
      expect(result).toContain('http://localhost');
    });
  });

  describe('log object', () => {
    it('should have all required logging methods', () => {
      expect(log).toHaveProperty('info');
      expect(log).toHaveProperty('success');
      expect(log).toHaveProperty('warning');
      expect(log).toHaveProperty('error');
      expect(log).toHaveProperty('building');
      expect(log).toHaveProperty('processing');
      expect(log).toHaveProperty('stats');
      expect(log).toHaveProperty('header');
      expect(log).toHaveProperty('step');
      expect(log).toHaveProperty('progress');
      expect(log).toHaveProperty('file');
      expect(log).toHaveProperty('url');
      expect(log).toHaveProperty('timing');
      expect(log).toHaveProperty('statsTable');
      expect(log).toHaveProperty('navigationTree');
      expect(log).toHaveProperty('startupBanner');
    });

    it('should have info method that logs with info formatting', () => {
      log.info('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have success method that logs with success formatting', () => {
      log.success('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have warning method that logs with warning formatting', () => {
      log.warning('test message');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should have error method that logs with error formatting', () => {
      log.error('test message');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should have building method that logs with building formatting', () => {
      log.building('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have processing method that logs with processing formatting', () => {
      log.processing('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have stats method that logs with stats formatting', () => {
      log.stats('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have header method that logs with header formatting', () => {
      log.header('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have timing method that logs timing with formatting', () => {
      log.timing('operation', 1500);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have statsTable method that logs table data', () => {
      log.statsTable({
        totalPages: 10,
        assetsCount: 5,
        buildTimeMs: 1500,
        outputSizeBytes: 102400,
        cacheHits: 3,
        cacheMisses: 7,
      });

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have navigationTree method that logs navigation tree', () => {
      const mockTree = [
        {
          title: 'Page 1',
          url: '/page1',
          children: [],
        },
        {
          title: 'Page 2',
          url: '/page2',
          children: [],
        },
      ];

      log.navigationTree(mockTree);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle nested navigation tree with children', () => {
      const nestedTree = [
        {
          title: 'Section 1',
          url: '/section1',
          isCollection: true,
          children: [
            { title: 'Child 1', url: '/section1/child1' },
            { title: 'Child 2', url: '/section1/child2' },
          ],
        },
        {
          title: 'Section 2',
          url: '/section2',
          isCollection: false,
          children: [{ title: 'Nested Child', url: '/section2/nested' }],
        },
      ];

      log.navigationTree(nestedTree);

      expect(consoleLogSpy).toHaveBeenCalled();
      // Verify multiple log calls for nested items
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('startupBanner', () => {
    it('should display Build mode banner', () => {
      log.startupBanner('Build', '1.0.0', '2.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Build');
      expect(output).toContain('1.0.0');
      expect(output).toContain('2.0.0');
    });

    it('should display Development Server mode banner', () => {
      log.startupBanner('Development Server', '1.2.3', '3.4.5');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Development Server');
      expect(output).toContain('1.2.3');
      expect(output).toContain('3.4.5');
    });

    it('should display Preview Server mode banner', () => {
      log.startupBanner('Preview Server', '0.1.0', '0.2.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Preview Server');
      expect(output).toContain('0.1.0');
      expect(output).toContain('0.2.0');
    });

    it('should include STATI name with gradient colors', () => {
      log.startupBanner('Build', '1.0.0', '1.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Check for ANSI escape codes (gradient colors)
      expect(output).toContain('\x1b[');
      // Check that individual letters are present
      expect(output).toContain('S');
      expect(output).toContain('T');
      expect(output).toContain('A');
      expect(output).toContain('I');
    });

    it('should include CLI and Core version labels', () => {
      log.startupBanner('Build', '1.0.0', '2.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('CLI');
      expect(output).toContain('Core');
    });
  });

  describe('rendering tree methods', () => {
    it('should have startRenderingTree method', () => {
      // startRenderingTree only creates tree structure, doesn't log immediately
      log.startRenderingTree('Test Title');

      // This test just ensures it doesn't throw
      expect(true).toBe(true);
    });

    it('should have addTreeNode method', () => {
      // addTreeNode only modifies tree structure, doesn't log immediately
      log.addTreeNode('root', 'node-1', 'Node Title', 'pending');

      // This test just ensures it doesn't throw
      expect(true).toBe(true);
    });

    it('should have updateTreeNode method', () => {
      // updateTreeNode only modifies tree structure, doesn't log immediately
      log.updateTreeNode('node-1', 'completed', { timing: 100, cacheHit: false });

      // This test just ensures it doesn't throw
      expect(true).toBe(true);
    });

    it('should have showRenderingTree method', () => {
      log.showRenderingTree();

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have clearRenderingTree method', () => {
      log.clearRenderingTree();

      // clearRenderingTree doesn't log, it just clears state
      // This test just ensures it doesn't throw
      expect(true).toBe(true);
    });

    it('should render a complete tree with all node statuses', () => {
      // Create a tree with various statuses to exercise getStatusColor
      log.startRenderingTree('Build Process');
      log.addTreeNode('root', 'pending-node', 'Pending Step', 'pending');
      log.addTreeNode('root', 'running-node', 'Running Step', 'running');
      log.addTreeNode('root', 'cached-node', 'Cached Step', 'cached');
      log.addTreeNode('root', 'completed-node', 'Completed Step', 'completed');
      log.addTreeNode('root', 'error-node', 'Error Step', 'error');

      log.showRenderingTree();

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should render tree nodes with metadata', () => {
      log.startRenderingTree('Build with metadata');
      log.addTreeNode('root', 'node-with-timing', 'Timed Step', 'completed', { timing: 150 });
      log.addTreeNode('root', 'node-with-long-timing', 'Long Timed Step', 'completed', {
        timing: 1500,
      });
      log.addTreeNode('root', 'node-with-cache', 'Cache Step', 'cached', { cacheHit: true });
      log.addTreeNode('root', 'node-with-url', 'URL Step', 'completed', { url: '/test' });
      log.addTreeNode('root', 'node-with-all', 'All Metadata', 'completed', {
        timing: 200,
        cacheHit: true,
        url: '/all-test',
        operation: 'render',
      });

      log.showRenderingTree();

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should update node status and metadata', () => {
      log.startRenderingTree('Update test');
      log.addTreeNode('root', 'update-node', 'Step', 'pending');
      log.updateTreeNode('update-node', 'running');
      log.updateTreeNode('update-node', 'completed', { timing: 50 });

      log.showRenderingTree();

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle nested tree nodes with children', () => {
      log.startRenderingTree('Nested Build');
      log.addTreeNode('root', 'parent-node', 'Parent Step', 'completed');
      log.addTreeNode('parent-node', 'child-node-1', 'Child 1', 'completed');
      log.addTreeNode('parent-node', 'child-node-2', 'Child 2', 'pending');
      log.addTreeNode('child-node-1', 'grandchild-node', 'Grandchild', 'cached');

      log.showRenderingTree();

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('file and url logging', () => {
    it('should have file method that logs file paths', () => {
      log.file('Creating', '/path/to/file.ts');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have url method that logs URLs', () => {
      log.url('Server', 'http://localhost:3000');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have step method that logs step information', () => {
      log.step(1, 5, 'Processing files');

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should have progress method that logs progress', () => {
      log.progress(50, 100, 'Building pages');

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
