/**
 * RenderScope with a stand-in template engine, for the cases a real build cannot reach.
 */
import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { EtaParseError, type Eta } from 'eta';
import { RenderScope } from '../../src/core/template-render.js';
import { TemplateIndex } from '../../src/core/template-index.js';
import type { Logger, PageModel } from '../../src/types/index.js';

// A source directory that does not exist, so no template file can be read from it
const srcDir = join(process.cwd(), 'test-fixtures-missing-site');

function createScope(eta: Partial<Eta>, files: string[]) {
  const logger = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    building: vi.fn(),
    processing: vi.fn(),
    stats: vi.fn(),
  } as unknown as Logger;
  const page: PageModel = {
    slug: '/',
    url: '/',
    sourcePath: join(srcDir, 'index.md'),
    frontMatter: {},
    content: '',
  };
  const scope = new RenderScope({
    page,
    eta: eta as Eta,
    index: new TemplateIndex(srcDir, files),
    logger,
    development: false,
  });
  return { scope, logger };
}

describe('RenderScope', () => {
  it('names the built-in Open Graph template in messages', () => {
    const { scope } = createScope({}, []);

    expect(scope.display(null)).toBe('the built-in Open Graph template');
  });

  it('reports an include that fails to compile when its file can no longer be read', async () => {
    // The engine compiled the include, but its file is gone by the time Stati reads it to check
    // for await, so the error is reported as the compile error it is
    const eta = {
      renderAsync: vi.fn(async (_file: string, context: object) =>
        (context as { include: (name: string) => string }).include('partials/broken'),
      ),
      render: vi.fn(() => {
        throw new EtaParseError('unclosed tag at line 1 col 5');
      }),
      compile: vi.fn(),
    };
    const { scope, logger } = createScope(eta as unknown as Partial<Eta>, [
      'layout.eta',
      'partials/broken.eta',
    ]);

    const html = await scope.renderAsync({ id: 'page', values: {} }, { file: 'layout.eta' });

    expect(html).toMatch(/^<!-- Error rendering .*partials\/broken\.eta: .*unclosed tag/);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/^Error rendering .*partials\/broken\.eta for \/: .*unclosed tag/),
    );
    expect(eta.compile).not.toHaveBeenCalled();
  });
});
