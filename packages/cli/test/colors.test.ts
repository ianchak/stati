import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from '../src/colors.js';

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
