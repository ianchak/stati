import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, colors } from '../src/colors.js';

describe('colors', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Force color output in tests
    process.env = { ...originalEnv, FORCE_COLOR: '1' };
    delete process.env.NO_COLOR;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('colors object', () => {
    it('should have all required color methods', () => {
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('info');
      expect(colors).toHaveProperty('muted');
      expect(colors).toHaveProperty('bold');
      expect(colors).toHaveProperty('number');
      expect(colors).toHaveProperty('brand');
      expect(colors).toHaveProperty('brandStrong');
      expect(colors).toHaveProperty('brandDim');
      expect(colors).toHaveProperty('dim');
      expect(colors).toHaveProperty('faint');
      expect(colors).toHaveProperty('successGlyph');
      expect(colors).toHaveProperty('warningGlyph');
      expect(colors).toHaveProperty('errorGlyph');
      expect(colors).toHaveProperty('file');
      expect(colors).toHaveProperty('folder');
      expect(colors).toHaveProperty('url');
      expect(colors).toHaveProperty('timing');
      expect(colors).toHaveProperty('underline');
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

    it('should truncate large folder contents and show "...and N more" marker', () => {
      // Create multiple folders with many children to trigger truncation (need > 100 total lines)
      const createFolder = (name: string, childCount: number) => ({
        title: name,
        url: `/${name.toLowerCase()}`,
        isCollection: true,
        children: Array.from({ length: childCount }, (_, i) => ({
          title: `${name} Item ${i + 1}`,
          url: `/${name.toLowerCase()}/item-${i + 1}`,
        })),
      });

      const largeTree = [
        createFolder('Folder1', 50),
        createFolder('Folder2', 50),
        createFolder('Folder3', 50),
      ];

      log.navigationTree(largeTree);

      // Get all logged output
      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain truncation marker
      expect(allOutput).toContain('...and');
      expect(allOutput).toContain('more item');
    });

    it('should limit total output to approximately 100 lines', () => {
      // Create multiple folders with many children
      const createFolder = (name: string, childCount: number) => ({
        title: name,
        url: `/${name.toLowerCase().replace(/\s/g, '-')}`,
        isCollection: true,
        children: Array.from({ length: childCount }, (_, i) => ({
          title: `${name} Item ${i + 1}`,
          url: `/${name.toLowerCase().replace(/\s/g, '-')}/item-${i + 1}`,
        })),
      });

      const hugeTree = [
        createFolder('Folder A', 40),
        createFolder('Folder B', 40),
        createFolder('Folder C', 40),
        createFolder('Folder D', 40),
      ];

      log.navigationTree(hugeTree);

      // Total console.log calls should be limited (100 lines max + some buffer for markers)
      expect(consoleLogSpy.mock.calls.length).toBeLessThanOrEqual(105);
    });

    it('should show all folders even when truncating children', () => {
      const createFolder = (name: string, childCount: number) => ({
        title: name,
        url: `/${name.toLowerCase()}`,
        isCollection: true,
        children: Array.from({ length: childCount }, (_, i) => ({
          title: `Child ${i + 1}`,
          url: `/${name.toLowerCase()}/child-${i + 1}`,
        })),
      });

      const treeWithManyFolders = [
        createFolder('Alpha', 30),
        createFolder('Beta', 30),
        createFolder('Gamma', 30),
      ];

      log.navigationTree(treeWithManyFolders);

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // All folder names should appear
      expect(allOutput).toContain('Alpha');
      expect(allOutput).toContain('Beta');
      expect(allOutput).toContain('Gamma');
    });

    it('should not truncate small navigation trees', () => {
      const smallTree = [
        {
          title: 'Page 1',
          url: '/page1',
          children: [
            { title: 'Child 1', url: '/page1/child1' },
            { title: 'Child 2', url: '/page1/child2' },
          ],
        },
        {
          title: 'Page 2',
          url: '/page2',
          children: [{ title: 'Child 3', url: '/page2/child3' }],
        },
      ];

      log.navigationTree(smallTree);

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should not contain truncation markers
      expect(allOutput).not.toContain('...and');
      expect(allOutput).not.toContain('more item');

      // All items should be present
      expect(allOutput).toContain('Page 1');
      expect(allOutput).toContain('Page 2');
      expect(allOutput).toContain('Child 1');
      expect(allOutput).toContain('Child 2');
      expect(allOutput).toContain('Child 3');
    });

    it('should handle singular "item" vs plural "items" in truncation message', () => {
      // Create a tree where exactly 1 item will be hidden
      // We need a situation where maxChildrenPerFolder cuts off exactly 1 item
      const treeWithOneHidden = [
        {
          title: 'Folder',
          url: '/folder',
          isCollection: true,
          children: Array.from({ length: 100 }, (_, i) => ({
            title: `Item ${i + 1}`,
            url: `/folder/item-${i + 1}`,
          })),
        },
      ];

      log.navigationTree(treeWithOneHidden);

      const allOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain truncation marker (either singular or plural)
      expect(allOutput).toMatch(/\.\.\.and \d+ more items?/);
    });
  });

  describe('startupBanner', () => {
    it('should display Build mode banner', () => {
      log.startupBanner('Build', '1.0.0', '2.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Mode is now shown in commandInfo box, not the banner
      expect(output).toContain('1.0.0');
      expect(output).toContain('2.0.0');
    });

    it('should display Development Server mode banner', () => {
      log.startupBanner('Development Server', '1.2.3', '3.4.5');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Mode is now shown in commandInfo box, not the banner
      expect(output).toContain('1.2.3');
      expect(output).toContain('3.4.5');
    });

    it('should display Preview Server mode banner', () => {
      log.startupBanner('Preview Server', '0.1.0', '0.2.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Mode is now shown in commandInfo box, not the banner
      expect(output).toContain('0.1.0');
      expect(output).toContain('0.2.0');
    });

    it('should include ASCII art banner with gradient colors', () => {
      log.startupBanner('Build', '1.0.0', '1.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Check for ANSI escape codes (gradient colors)
      expect(output).toContain('\x1b[');
      // Check that ASCII art block characters are present
      expect(output).toContain('█');
      expect(output).toContain('╗');
      expect(output).toContain('╚');
    });

    it('should include package names and version labels', () => {
      log.startupBanner('Build', '1.0.0', '2.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('@stati/cli');
      expect(output).toContain('@stati/core');
    });

    it('should not contain emoji in banner', () => {
      log.startupBanner('Build', '1.0.0', '1.0.0');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).not.toContain('⚡');
    });
  });

  describe('commandInfo', () => {
    it('should display command name in box', () => {
      log.commandInfo('build', []);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Build');
      expect(output).toContain('Command');
      // Box characters
      expect(output).toContain('┌');
      expect(output).toContain('└');
    });

    it('should display enabled options with highlight', () => {
      log.commandInfo('build', [
        { name: 'Force', value: true, isDefault: false },
        { name: 'Clean', value: false, isDefault: true },
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Force');
      expect(output).toContain('enabled');
      expect(output).toContain('Clean');
      expect(output).toContain('off');
    });

    it('should display string values', () => {
      log.commandInfo('dev', [
        { name: 'Host', value: 'localhost', isDefault: true },
        { name: 'Port', value: 3000, isDefault: true },
      ]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Host');
      expect(output).toContain('localhost');
      expect(output).toContain('Port');
      expect(output).toContain('3000');
    });

    it('should display dash for empty string values', () => {
      log.commandInfo('build', [{ name: 'Config', value: '', isDefault: true }]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Config');
      expect(output).toContain('–');
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

  describe('glyph output', () => {
    it('should use checkmark glyph for success instead of emoji', () => {
      log.success('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('✓');
      expect(output).not.toContain('✅');
    });

    it('should use cross glyph for error instead of emoji', () => {
      log.error('test message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('×');
      expect(output).not.toContain('❌');
    });

    it('should use exclamation glyph for warning instead of emoji', () => {
      log.warning('test message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('!');
      expect(output).not.toContain('⚠️');
    });

    it('should use plus/tilde/equals glyphs for file operations instead of emoji', () => {
      log.file('create', '/path/to/file.ts');
      expect(consoleLogSpy).toHaveBeenCalled();
      const createOutput = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(createOutput).toContain('+');
      expect(createOutput).not.toContain('✨');

      consoleLogSpy.mockClear();

      log.file('update', '/path/to/file.ts');
      const updateOutput = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(updateOutput).toContain('~');
      expect(updateOutput).not.toContain('📝');

      consoleLogSpy.mockClear();

      log.file('copy', '/path/to/file.ts');
      const copyOutput = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(copyOutput).toContain('=');
      expect(copyOutput).not.toContain('📄');
    });
  });

  describe('Ice Blue palette', () => {
    it('should have brandStrong color function', () => {
      const result = colors.brandStrong('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
    });

    it('should have brandDim color function', () => {
      const result = colors.brandDim('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
    });

    it('should have dim color function', () => {
      const result = colors.dim('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
    });

    it('should have faint color function', () => {
      const result = colors.faint('test');
      expect(result).toContain('\x1b[');
      expect(result).toContain('test');
    });

    it('should have successGlyph color function', () => {
      const result = colors.successGlyph('✓');
      expect(result).toContain('\x1b[');
      expect(result).toContain('✓');
    });

    it('should have warningGlyph color function', () => {
      const result = colors.warningGlyph('!');
      expect(result).toContain('\x1b[');
      expect(result).toContain('!');
    });

    it('should have errorGlyph color function', () => {
      const result = colors.errorGlyph('×');
      expect(result).toContain('\x1b[');
      expect(result).toContain('×');
    });

    it('should have underline formatting', () => {
      const result = colors.underline('underlined text');
      expect(result).toContain('\x1b[4m');
      expect(result).toContain('underlined text');
    });
  });

  describe('progress bar methods', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true) as any;
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it('should have progress bar methods', () => {
      expect(log).toHaveProperty('startProgress');
      expect(log).toHaveProperty('updateProgress');
      expect(log).toHaveProperty('endProgress');
      expect(log).toHaveProperty('showRenderingSummary');
    });

    it('should start progress and display initial state', () => {
      log.startProgress(100);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('Rendering pages');
      expect(output).toContain('0%');
      expect(output).toContain('0/100');

      // Cleanup
      log.endProgress();
    });

    it('should update progress with cached page', () => {
      log.startProgress(10);
      consoleLogSpy.mockClear();

      log.updateProgress('cached', '/docs/intro/');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('cached');
      expect(output).toContain('10%');
      expect(output).toContain('1/10');

      log.endProgress();
    });

    it('should update progress with rendered page and timing', () => {
      log.startProgress(10);
      consoleLogSpy.mockClear();

      log.updateProgress('rendered', '/docs/api/', 125);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('rendered');
      expect(output).toContain('/docs/api/');

      log.endProgress();
    });

    it('should track errors in progress', () => {
      log.startProgress(10);
      consoleLogSpy.mockClear();

      log.updateProgress('error', '/broken/page/');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain('error');

      log.endProgress();
    });

    it('should show summary with slowest pages', () => {
      log.startProgress(5);

      // Simulate some cached and rendered pages
      log.updateProgress('cached', '/cached-1/');
      log.updateProgress('cached', '/cached-2/');
      log.updateProgress('rendered', '/slow/', 500);
      log.updateProgress('rendered', '/fast/', 50);
      log.updateProgress('rendered', '/medium/', 200);

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Should show cached count
      expect(output).toContain('2');
      expect(output).toContain('Cached');

      // Should show rendered count
      expect(output).toContain('3');
      expect(output).toContain('Rendered');

      // Should show slowest pages (sorted by timing)
      expect(output).toContain('Slowest pages');
      expect(output).toContain('/slow/');
      expect(output).toContain('500ms');

      // Should show cache hit rate
      expect(output).toContain('Cache hit rate');
      expect(output).toContain('40%'); // 2/5 = 40%
    });

    it('should truncate long URLs in progress display', () => {
      log.startProgress(10);
      consoleLogSpy.mockClear();

      const longUrl = '/very/long/path/to/a/deeply/nested/page/in/the/docs/section/api/reference/';
      log.updateProgress('rendered', longUrl, 100);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Should truncate with ellipsis
      expect(output).toContain('...');
      // The full long URL should not appear in the output (it should be truncated)
      expect(output).not.toContain(longUrl);

      log.endProgress();
    });

    it('should calculate average render time in summary', () => {
      log.startProgress(3);

      log.updateProgress('rendered', '/page-1/', 100);
      log.updateProgress('rendered', '/page-2/', 200);
      log.updateProgress('rendered', '/page-3/', 300);

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Average should be (100+200+300)/3 = 200ms
      expect(output).toContain('avg');
      expect(output).toContain('200ms');
    });

    it('should clear progress display on endProgress', () => {
      // Mock isTTY to true so ANSI codes are written
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

      try {
        log.startProgress(10);
        log.updateProgress('rendered', '/test/', 50);

        // endProgress should write cursor movement codes to clear lines
        log.endProgress();

        // Should have written ANSI escape codes to move cursor up
        expect(stdoutWriteSpy).toHaveBeenCalled();
      } finally {
        // Restore original isTTY value
        Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, writable: true });
      }
    });

    it('should show errors line in summary when errors occurred', () => {
      log.startProgress(5);

      log.updateProgress('rendered', '/page-1/', 100);
      log.updateProgress('error', '/broken-page/');
      log.updateProgress('rendered', '/page-2/', 100);

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Should show error count
      expect(output).toContain('Errors');
      expect(output).toContain('1');
    });

    it('should format time correctly for render times >= 1 second in summary', () => {
      log.startProgress(3);

      log.updateProgress('rendered', '/page-1/', 1500); // 1.5s
      log.updateProgress('rendered', '/page-2/', 2500); // 2.5s
      log.updateProgress('rendered', '/page-3/', 3500); // 3.5s

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Average should be 2.5s, formatted as seconds
      expect(output).toContain('avg');
      expect(output).toContain('s'); // Should use seconds
    });

    it('should format total time correctly for times >= 1 second', () => {
      log.startProgress(1);

      log.updateProgress('rendered', '/page/', 50);

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Should show total time and cache hit rate
      expect(output).toContain('Total');
      expect(output).toContain('Cache hit rate');
    });

    it('should handle progress update when not active', () => {
      // Don't start progress, just try to update
      log.updateProgress('rendered', '/test/', 100);

      // Should not throw and should not log anything
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle end progress when not active', () => {
      // Don't start progress, just try to end
      log.endProgress();

      // Should not throw and should not write cursor movement codes
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe('ASCII icon mode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, FORCE_COLOR: '1', STATI_ASCII_ICONS: '1' };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use ASCII glyphs when STATI_ASCII_ICONS is set', () => {
      log.success('test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // ASCII mode uses 'OK' instead of '✓'
      expect(output).toContain('OK');
    });

    it('should use ASCII arrows for file operations', () => {
      log.file('copy', '/path/to/file.ts');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Should still use = for copy
      expect(output).toContain('=');
    });
  });

  describe('NO_COLOR environment variable', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NO_COLOR: '1' };
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should not apply ANSI codes when NO_COLOR is set', () => {
      const result = colors.brand('test');
      // When NO_COLOR is set, should return plain text without ANSI codes
      expect(result).toBe('test');
      expect(result).not.toContain('\x1b[');
    });

    it('should not apply bold formatting when NO_COLOR is set', () => {
      const result = colors.bold('bold text');
      expect(result).toBe('bold text');
      expect(result).not.toContain('\x1b[1m');
    });

    it('should not apply underline formatting when NO_COLOR is set', () => {
      const result = colors.underline('underlined');
      expect(result).toBe('underlined');
      expect(result).not.toContain('\x1b[4m');
    });

    it('should format numbers without ANSI codes when NO_COLOR is set', () => {
      const result = colors.number(42);
      expect(result).toBe('42');
      expect(result).not.toContain('\x1b[');
    });
  });

  describe('command info box plain text fallback', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NO_COLOR: '1' };
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should render plain text command info when NO_COLOR is set', () => {
      log.commandInfo('build', [{ name: 'Force', value: true, isDefault: false }]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      // Plain text fallback should not have box drawing characters
      expect(output).toContain('Command');
      expect(output).toContain('build');
    });
  });

  describe('slowest pages formatting', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true) as any;
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it('should format slowest page times >= 1 second correctly', () => {
      log.startProgress(3);

      log.updateProgress('rendered', '/slow-page/', 1500);
      log.updateProgress('rendered', '/fast-page/', 100);
      log.updateProgress('rendered', '/medium-page/', 500);

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Should format 1500ms as 1.50s
      expect(output).toContain('/slow-page/');
      expect(output).toMatch(/1\.50?s/); // 1.5s or 1.50s
    });

    it('should limit slowest pages to top 5', () => {
      log.startProgress(10);

      // Render 10 pages with different timings
      for (let i = 0; i < 10; i++) {
        log.updateProgress('rendered', `/page-${i}/`, (i + 1) * 100);
      }

      log.endProgress();
      consoleLogSpy.mockClear();

      log.showRenderingSummary();

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;

      // Should show the slowest pages but only up to 5
      expect(output).toContain('/page-9/'); // 1000ms - slowest
      expect(output).toContain('/page-8/'); // 900ms
      expect(output).toContain('/page-7/'); // 800ms
      expect(output).toContain('/page-6/'); // 700ms
      expect(output).toContain('/page-5/'); // 600ms
      // Should not show pages 0-4 (faster ones)
      expect(output).not.toContain('/page-0/');
    });
  });
});
