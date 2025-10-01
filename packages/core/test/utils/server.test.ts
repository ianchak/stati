import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { resolvePrettyUrl } from '../../src/core/utils/server.js';

describe('resolvePrettyUrl', () => {
  const testDir = join(process.cwd(), 'test-server-utils');
  const outDir = join(testDir, 'dist');

  beforeAll(async () => {
    // Create test directory structure
    await mkdir(outDir, { recursive: true });
    await mkdir(join(outDir, 'blog'), { recursive: true });

    // Create test files
    await writeFile(join(outDir, 'index.html'), '<h1>Home</h1>');
    await writeFile(join(outDir, 'about.html'), '<h1>About</h1>');
    await writeFile(join(outDir, 'blog', 'index.html'), '<h1>Blog</h1>');
    await writeFile(join(outDir, 'contact.html'), '<h1>Contact</h1>');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should resolve root path to index.html', async () => {
    const result = await resolvePrettyUrl(outDir, '/', join(outDir, 'index.html'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'index.html'));
  });

  it('should resolve existing file directly', async () => {
    const result = await resolvePrettyUrl(outDir, '/about.html', join(outDir, 'about.html'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'about.html'));
  });

  it('should resolve directory to index.html', async () => {
    const result = await resolvePrettyUrl(outDir, '/blog/', join(outDir, 'blog'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'blog', 'index.html'));
  });

  it('should fallback from directory with trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/contact/', join(outDir, 'contact'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'contact.html'));
  });

  it('should fallback from missing file with trailing slash to .html file', async () => {
    const result = await resolvePrettyUrl(outDir, '/about/', join(outDir, 'about'));

    expect(result.found).toBe(true);
    expect(result.filePath).toBe(join(outDir, 'about.html'));
  });

  it('should return not found for non-existent paths', async () => {
    const result = await resolvePrettyUrl(outDir, '/nonexistent/', join(outDir, 'nonexistent'));

    expect(result.found).toBe(false);
    expect(result.filePath).toBe(null);
  });

  it('should return not found for non-existent files', async () => {
    const result = await resolvePrettyUrl(outDir, '/missing.html', join(outDir, 'missing.html'));

    expect(result.found).toBe(false);
    expect(result.filePath).toBe(null);
  });
});
