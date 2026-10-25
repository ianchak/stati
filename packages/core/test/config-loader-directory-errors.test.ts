import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';

vi.mock('../src/config/directories.js', () => ({
  validateDirectoryLayout: vi.fn(),
}));

import { loadConfig, clearConfigCache } from '../src/config/loader.js';
import { validateDirectoryLayout } from '../src/config/directories.js';

describe('config loader directory layout errors', () => {
  let testDir: string;

  beforeEach(() => {
    clearConfigCache();
    testDir = join(tmpdir(), `stati-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      join(testDir, 'stati.config.mjs'),
      `export default { site: { title: 'Test', baseUrl: 'https://example.com' } };`,
      'utf-8',
    );
  });

  afterEach(() => {
    vi.mocked(validateDirectoryLayout).mockReset();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('logs an unexpected error from the directory check and falls back to the defaults', async () => {
    const unexpected = new TypeError('unexpected failure');
    vi.mocked(validateDirectoryLayout).mockImplementation(() => {
      throw unexpected;
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const config = await loadConfig(testDir);

    expect(config.outDir).toBe('dist');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error loading config from'),
      unexpected,
    );

    consoleErrorSpy.mockRestore();
  });
});
