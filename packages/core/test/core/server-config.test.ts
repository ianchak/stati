import { describe, it, expect, vi } from 'vitest';
import { join } from 'node:path';
import { loadServerConfig } from '../../src/core/server-config.js';
import { loadConfig } from '../../src/config/loader.js';
import type { Logger } from '../../src/types/index.js';

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

function createLogger(): Logger {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  };
}

describe('loadServerConfig', () => {
  it("loads the current directory's config and resolves its directories", async () => {
    const config = {
      srcDir: 'content',
      outDir: 'public_html',
      staticDir: 'static',
      site: { title: 'Site', baseUrl: 'https://example.com' },
    };
    vi.mocked(loadConfig).mockResolvedValueOnce(config);

    expect(await loadServerConfig(createLogger())).toEqual({
      config,
      srcDir: join(process.cwd(), 'content'),
      outDir: join(process.cwd(), 'public_html'),
      staticDir: join(process.cwd(), 'static'),
    });
    expect(loadConfig).toHaveBeenCalledExactlyOnceWith(process.cwd());
  });

  it.each([
    ['an Error', new Error('srcDir must be a string')],
    ['something else', 'srcDir must be a string'],
  ])('logs and rethrows a config that fails to load with %s', async (_kind, thrown) => {
    vi.mocked(loadConfig).mockRejectedValueOnce(thrown);
    const logger = createLogger();

    await expect(loadServerConfig(logger)).rejects.toBe(thrown);
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      'Failed to load config: srcDir must be a string',
    );
  });
});
