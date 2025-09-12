import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir, access, readFile } from 'fs/promises';
import { ExampleManager } from '../src/examples.js';

describe('ExampleManager', () => {
  let tempDir: string;
  let exampleManager: ExampleManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-examples-test-'));
    exampleManager = new ExampleManager();
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('getAvailableExamples', () => {
    it('should return blank template metadata', async () => {
      const examples = await exampleManager.getAvailableExamples();

      expect(examples).toHaveLength(1);
      expect(examples[0]).toEqual({
        name: 'blank',
        title: 'Blank Template',
        description:
          'A minimal starter template with basic CSS, semantic HTML, and essential meta tags',
        features: ['Minimal CSS reset', 'Accessibility features', 'SEO-friendly structure'],
        difficulty: 'beginner',
        estimatedSetupTime: '2 minutes',
      });
    });
  });

  describe('copyExample', () => {
    beforeEach(async () => {
      // Create a mock example directory structure for testing
      const mockExampleDir = join(tempDir, 'mock-examples', 'blank');
      await mkdir(mockExampleDir, { recursive: true });

      // Create test files
      await writeFile(
        join(mockExampleDir, 'package.json'),
        JSON.stringify(
          {
            name: 'blank-template',
            scripts: { dev: 'stati dev' },
          },
          null,
          2,
        ),
      );

      await writeFile(join(mockExampleDir, 'stati.config.js'), 'export default {}');
      await writeFile(join(mockExampleDir, 'README.md'), '# Blank Template');

      // Create subdirectories
      await mkdir(join(mockExampleDir, 'site'), { recursive: true });
      await writeFile(join(mockExampleDir, 'site', 'index.md'), '# Welcome');
      await writeFile(join(mockExampleDir, 'site', 'layout.eta'), '<html><%= it.content %></html>');

      await mkdir(join(mockExampleDir, 'public'), { recursive: true });
      await writeFile(join(mockExampleDir, 'public', 'styles.css'), 'body { margin: 0; }');

      // Create a binary file (simulated)
      await writeFile(
        join(mockExampleDir, 'public', 'favicon.ico'),
        Buffer.from([0x00, 0x01, 0x02]),
      );

      // Create files that should be excluded
      await mkdir(join(mockExampleDir, 'node_modules', 'test'), { recursive: true });
      await writeFile(
        join(mockExampleDir, 'node_modules', 'test', 'index.js'),
        'module.exports = {}',
      );

      await mkdir(join(mockExampleDir, '.git'), { recursive: true });
      await writeFile(join(mockExampleDir, '.git', 'config'), '[core]');

      await mkdir(join(mockExampleDir, 'dist'), { recursive: true });
      await writeFile(join(mockExampleDir, 'dist', 'index.html'), '<html></html>');

      // Mock the examples directory
      Object.defineProperty(exampleManager, 'examplesDir', {
        get: () => join(tempDir, 'mock-examples'),
        configurable: true,
      });
    });

    it('should copy example files to target directory', async () => {
      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      // Verify core files were copied
      await expect(access(join(targetDir, 'package.json'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'stati.config.js'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'README.md'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'site', 'index.md'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'site', 'layout.eta'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'public', 'styles.css'))).resolves.not.toThrow();
      await expect(access(join(targetDir, 'public', 'favicon.ico'))).resolves.not.toThrow();

      // Verify content is correct
      const packageJson = JSON.parse(await readFile(join(targetDir, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe('blank-template');
      expect(packageJson.scripts.dev).toBe('stati dev');

      const indexMd = await readFile(join(targetDir, 'site', 'index.md'), 'utf-8');
      expect(indexMd).toBe('# Welcome');
    });

    it('should exclude node_modules directory', async () => {
      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      // Verify excluded directories were not copied
      await expect(access(join(targetDir, 'node_modules'))).rejects.toThrow();
    });

    it('should exclude .git directory', async () => {
      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      await expect(access(join(targetDir, '.git'))).rejects.toThrow();
    });

    it('should exclude dist directory', async () => {
      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      await expect(access(join(targetDir, 'dist'))).rejects.toThrow();
    });

    it('should copy binary files correctly', async () => {
      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      const sourceBuffer = await readFile(
        join(tempDir, 'mock-examples', 'blank', 'public', 'favicon.ico'),
      );
      const targetBuffer = await readFile(join(targetDir, 'public', 'favicon.ico'));

      expect(Buffer.compare(sourceBuffer, targetBuffer)).toBe(0);
    });

    it('should throw error for non-existent template', async () => {
      const targetDir = join(tempDir, 'output');

      await expect(exampleManager.copyExample('non-existent', targetDir)).rejects.toThrow(
        "Example template 'non-existent' not found",
      );
    });

    it('should create target directory if it does not exist', async () => {
      const targetDir = join(tempDir, 'nested', 'output', 'dir');

      await exampleManager.copyExample('blank', targetDir);

      await expect(access(join(targetDir, 'package.json'))).resolves.not.toThrow();
    });

    it('should handle nested directory structure', async () => {
      // Add nested directories to mock example
      const mockExampleDir = join(tempDir, 'mock-examples', 'blank');
      await mkdir(join(mockExampleDir, 'site', '_partials'), { recursive: true });
      await writeFile(
        join(mockExampleDir, 'site', '_partials', 'header.eta'),
        '<header>Header</header>',
      );

      const targetDir = join(tempDir, 'output');

      await exampleManager.copyExample('blank', targetDir);

      await expect(
        access(join(targetDir, 'site', '_partials', 'header.eta')),
      ).resolves.not.toThrow();

      const headerContent = await readFile(
        join(targetDir, 'site', '_partials', 'header.eta'),
        'utf-8',
      );
      expect(headerContent).toBe('<header>Header</header>');
    });
  });
});
