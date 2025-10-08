import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '../src/colors.js';

describe('colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.info('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have success method that logs with success formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.success('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have warning method that logs with warning formatting', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      log.warning('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have error method that logs with error formatting', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      log.error('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have building method that logs with building formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.building('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have processing method that logs with processing formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.processing('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have stats method that logs with stats formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.stats('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have header method that logs with header formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.header('test message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have timing method that logs timing with formatting', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.timing('operation', 1500);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have statsTable method that logs table data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.statsTable({
        totalPages: 10,
        assetsCount: 5,
        buildTimeMs: 1500,
        outputSizeBytes: 102400,
        cacheHits: 3,
        cacheMisses: 7,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have navigationTree method that logs navigation tree', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.showRenderingTree();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.file('Creating', '/path/to/file.ts');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have url method that logs URLs', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.url('Server', 'http://localhost:3000');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have step method that logs step information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.step(1, 5, 'Processing files');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should have progress method that logs progress', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      log.progress(50, 100, 'Building pages');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
