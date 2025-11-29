import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  computeContentHash,
  computeFileHash,
  computeInputsHash,
  computeNavigationHash,
} from '../../../src/core/isg/hash.js';

describe('Hash Utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'stati-hash-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('computeContentHash', () => {
    it('should compute consistent hash for same content and frontmatter', () => {
      const content = '# Hello World';
      const frontMatter = { title: 'Test', tags: ['a', 'b'] };

      const hash1 = computeContentHash(content, frontMatter);
      const hash2 = computeContentHash(content, frontMatter);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different content', () => {
      const frontMatter = { title: 'Test' };

      const hash1 = computeContentHash('# Hello', frontMatter);
      const hash2 = computeContentHash('# World', frontMatter);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different frontmatter', () => {
      const content = '# Hello World';

      const hash1 = computeContentHash(content, { title: 'Test 1' });
      const hash2 = computeContentHash(content, { title: 'Test 2' });

      expect(hash1).not.toBe(hash2);
    });

    it('should sort frontmatter keys for consistency', () => {
      const content = '# Test';

      const hash1 = computeContentHash(content, { z: 'last', a: 'first' });
      const hash2 = computeContentHash(content, { a: 'first', z: 'last' });

      expect(hash1).toBe(hash2);
    });

    it('should handle nested objects in frontmatter', () => {
      const content = '# Test';
      const frontMatter = {
        meta: {
          z: 'value',
          a: 'value',
        },
        tags: ['tag1', 'tag2'],
      };

      const hash = computeContentHash(content, frontMatter);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should sort nested object keys for consistency', () => {
      const content = '# Test';

      const hash1 = computeContentHash(content, {
        outer: { z: 'last', a: 'first' },
        tags: ['tag1'],
      });

      const hash2 = computeContentHash(content, {
        tags: ['tag1'],
        outer: { a: 'first', z: 'last' },
      });

      expect(hash1).toBe(hash2);
    });

    it('should handle arrays in frontmatter', () => {
      const content = '# Test';
      const frontMatter = {
        tags: ['tag1', 'tag2', 'tag3'],
        nested: [{ a: 1 }, { b: 2 }],
      };

      const hash = computeContentHash(content, frontMatter);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should handle null values in frontmatter', () => {
      const content = '# Test';
      const frontMatter = {
        nullable: null,
        defined: 'value',
      };

      const hash = computeContentHash(content, frontMatter);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should handle primitive values in frontmatter', () => {
      const content = '# Test';
      const frontMatter = {
        string: 'value',
        number: 42,
        boolean: true,
        nullValue: null,
      };

      const hash = computeContentHash(content, frontMatter);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });
  });

  describe('computeFileHash', () => {
    it('should compute hash for existing file', async () => {
      const filePath = join(tempDir, 'test.eta');
      await writeFile(filePath, '<h1>Test Template</h1>');

      const hash = await computeFileHash(filePath);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should return null for non-existent file', async () => {
      const filePath = join(tempDir, 'non-existent.eta');

      const hash = await computeFileHash(filePath);

      expect(hash).toBeNull();
    });

    it('should compute consistent hash for same file content', async () => {
      const filePath = join(tempDir, 'test.eta');
      const content = '<h1>Test Template</h1>';
      await writeFile(filePath, content);

      const hash1 = await computeFileHash(filePath);
      const hash2 = await computeFileHash(filePath);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different file content', async () => {
      const file1 = join(tempDir, 'test1.eta');
      const file2 = join(tempDir, 'test2.eta');

      await writeFile(file1, '<h1>Template 1</h1>');
      await writeFile(file2, '<h1>Template 2</h1>');

      const hash1 = await computeFileHash(file1);
      const hash2 = await computeFileHash(file2);

      expect(hash1).not.toBe(hash2);
    });

    it('should return null for empty file', async () => {
      const filePath = join(tempDir, 'empty.eta');
      await writeFile(filePath, '');

      const hash = await computeFileHash(filePath);

      expect(hash).toBeNull();
    });

    it('should handle file read errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to hash a directory instead of a file to trigger an error
      const hash = await computeFileHash(tempDir);

      expect(hash).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('computeInputsHash', () => {
    it('should combine content hash with dependency hashes', () => {
      const contentHash = 'sha256-content123';
      const depsHashes = ['sha256-dep1', 'sha256-dep2'];

      const hash = computeInputsHash(contentHash, depsHashes);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should produce consistent hash with same inputs', () => {
      const contentHash = 'sha256-content123';
      const depsHashes = ['sha256-dep1', 'sha256-dep2'];

      const hash1 = computeInputsHash(contentHash, depsHashes);
      const hash2 = computeInputsHash(contentHash, depsHashes);

      expect(hash1).toBe(hash2);
    });

    it('should sort dependency hashes for consistency', () => {
      const contentHash = 'sha256-content123';

      const hash1 = computeInputsHash(contentHash, ['sha256-depZ', 'sha256-depA']);
      const hash2 = computeInputsHash(contentHash, ['sha256-depA', 'sha256-depZ']);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty dependencies array', () => {
      const contentHash = 'sha256-content123';
      const depsHashes: string[] = [];

      const hash = computeInputsHash(contentHash, depsHashes);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different content', () => {
      const depsHashes = ['sha256-dep1', 'sha256-dep2'];

      const hash1 = computeInputsHash('sha256-content1', depsHashes);
      const hash2 = computeInputsHash('sha256-content2', depsHashes);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different dependencies', () => {
      const contentHash = 'sha256-content123';

      const hash1 = computeInputsHash(contentHash, ['sha256-dep1']);
      const hash2 = computeInputsHash(contentHash, ['sha256-dep2']);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeNavigationHash', () => {
    it('should compute hash for navigation tree', () => {
      const navigation = [
        { title: 'Home', url: '/' },
        { title: 'About', url: '/about' },
      ];

      const hash = computeNavigationHash(navigation);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should produce consistent hash for same navigation', () => {
      const navigation = [
        { title: 'Home', url: '/' },
        { title: 'About', url: '/about' },
      ];

      const hash1 = computeNavigationHash(navigation);
      const hash2 = computeNavigationHash(navigation);

      expect(hash1).toBe(hash2);
    });

    it('should include order field when present', () => {
      const nav1 = [
        { title: 'Home', url: '/', order: 1 },
        { title: 'About', url: '/about', order: 2 },
      ];

      const nav2 = [
        { title: 'Home', url: '/', order: 1 },
        { title: 'About', url: '/about', order: 3 },
      ];

      const hash1 = computeNavigationHash(nav1);
      const hash2 = computeNavigationHash(nav2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle nested children', () => {
      const navigation = [
        {
          title: 'Parent',
          url: '/parent',
          children: [
            { title: 'Child 1', url: '/parent/child1' },
            { title: 'Child 2', url: '/parent/child2' },
          ],
        },
      ];

      const hash = computeNavigationHash(navigation);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should detect changes in nested children', () => {
      const nav1 = [
        {
          title: 'Parent',
          url: '/parent',
          children: [{ title: 'Child 1', url: '/parent/child1' }],
        },
      ];

      const nav2 = [
        {
          title: 'Parent',
          url: '/parent',
          children: [{ title: 'Child 2', url: '/parent/child2' }],
        },
      ];

      const hash1 = computeNavigationHash(nav1);
      const hash2 = computeNavigationHash(nav2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty children arrays', () => {
      const navigation = [
        {
          title: 'Parent',
          url: '/parent',
          children: [],
        },
      ];

      const hash = computeNavigationHash(navigation);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });

    it('should ignore non-structural fields', () => {
      const nav1 = [
        {
          title: 'Home',
          url: '/',
          description: 'This is the home page',
          metadata: { foo: 'bar' },
        },
      ];

      const nav2 = [
        {
          title: 'Home',
          url: '/',
          description: 'Different description',
          metadata: { baz: 'qux' },
        },
      ];

      const hash1 = computeNavigationHash(nav1);
      const hash2 = computeNavigationHash(nav2);

      // Hashes should be the same because only title, url, order, and children matter
      expect(hash1).toBe(hash2);
    });

    it('should handle nodes with undefined or missing fields', () => {
      const navigation = [
        {
          title: 'Home',
          url: undefined,
        },
        {
          title: undefined,
          url: '/about',
        },
      ];

      const hash = computeNavigationHash(navigation);

      expect(hash).toMatch(/^sha256-[a-f0-9]{64}$/);
    });
  });
});
