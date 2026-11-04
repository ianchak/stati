/**
 * The dev server's rebuild planning and its log, which are pure. Rebuilding itself is tested
 * through the dev server in dev.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  sortChanges,
  planRebuild,
  describeRebuild,
  createRebuildLogger,
} from '../../src/core/dev-rebuild.js';
import type { SortedChange, TemplateChangeResult } from '../../src/core/dev-rebuild.js';
import type { Logger } from '../../src/types/index.js';

const cwd = '/project';

/** A change of the given kind */
function change(
  path: string,
  eventType: SortedChange['eventType'],
  kind: 'template' | 'static' | 'content',
): SortedChange {
  return { path, eventType, template: kind === 'template', staticAsset: kind === 'static' };
}

const templates = (rebuild: TemplateChangeResult['rebuild'], affectedPages = 0) => ({
  affectedPages,
  totalPages: 4,
  rebuild,
});

describe('sortChanges', () => {
  it('sorts templates, static assets and content', () => {
    expect(
      sortChanges(
        [
          { path: '/project/site/layout.eta', eventType: 'change' },
          { path: '/project/site/index.md', eventType: 'add' },
          { path: '/project/public/logo.png', eventType: 'unlink' },
          // Only .eta files in the source directory are templates
          { path: '/project/public/snippet.eta', eventType: 'change' },
        ],
        '/project/site',
        '/project/public',
      ),
    ).toEqual([
      change('/project/site/layout.eta', 'change', 'template'),
      change('/project/site/index.md', 'add', 'content'),
      change('/project/public/logo.png', 'unlink', 'static'),
      change('/project/public/snippet.eta', 'change', 'static'),
    ]);
  });

  it('matches Windows paths with backslashes', () => {
    expect(
      sortChanges(
        [
          { path: 'C:\\project\\site\\layout.eta', eventType: 'change' },
          { path: 'C:\\project\\public\\logo.png', eventType: 'add' },
        ],
        'C:\\project\\site',
        'C:\\project\\public',
      ),
    ).toEqual([
      change('C:\\project\\site\\layout.eta', 'change', 'template'),
      change('C:\\project\\public\\logo.png', 'add', 'static'),
    ]);
  });
});

describe('planRebuild', () => {
  it('builds Markdown and static changes incrementally, copying the static assets', () => {
    expect(planRebuild(null, true)).toEqual({
      rebuild: 'incremental',
      copyAssets: true,
      showProgress: false,
    });
  });

  it('builds nothing for templates no page uses', () => {
    expect(planRebuild(templates('none'), false)).toEqual({
      rebuild: 'none',
      copyAssets: false,
      showProgress: true,
    });
  });

  it('still builds when other files changed with a template no page uses', () => {
    expect(planRebuild(templates('none'), true)).toEqual({
      rebuild: 'incremental',
      copyAssets: true,
      showProgress: true,
    });
  });

  it.each(['incremental', 'full'] as const)(
    'runs the %s build template changes require, without copying the static assets',
    (rebuild) => {
      expect(planRebuild(templates(rebuild, 2), false)).toEqual({
        rebuild,
        copyAssets: false,
        showProgress: true,
      });
    },
  );
});

describe('describeRebuild', () => {
  it('names each changed file, relative to the project, with what happened to it', () => {
    expect(
      describeRebuild(
        [
          change('/project/site/index.md', 'change', 'content'),
          change('/project/public/logo.png', 'add', 'static'),
          change('/project/site/old.md', 'unlink', 'content'),
        ],
        { templateResult: null, rebuild: 'incremental', durationMs: 12 },
        cwd,
      ),
    ).toEqual([
      '▸ site/index.md rebuilt',
      '   Done in 12ms',
      '▸ public/logo.png copied',
      '   Done in 12ms',
      '▸ site/old.md deleted',
      '   Done in 12ms',
    ]);
  });

  it('logs project-relative paths with forward slashes on Windows', () => {
    expect(
      describeRebuild(
        [change('C:\\project\\site\\index.md', 'change', 'content')],
        { templateResult: null, rebuild: 'incremental', durationMs: 3 },
        'C:\\project',
      ),
    ).toEqual(['▸ site/index.md rebuilt', '   Done in 3ms']);
  });

  it('says how many pages a template change rebuilt', () => {
    expect(
      describeRebuild(
        [
          change('/project/site/layout.eta', 'change', 'template'),
          change('/project/site/blog/partials/header.eta', 'add', 'template'),
        ],
        { templateResult: templates('incremental', 3), rebuild: 'incremental', durationMs: 40 },
        cwd,
      ),
    ).toEqual([
      '▸ site/layout.eta changed',
      '   3/4 pages rebuilt in 40ms',
      '▸ site/blog/partials/header.eta added',
      '   3/4 pages rebuilt in 40ms',
    ]);
  });

  it('says when a template change rebuilt every page', () => {
    expect(
      describeRebuild(
        [change('/project/site/layout.eta', 'change', 'template')],
        { templateResult: templates('full', 4), rebuild: 'full', durationMs: 90 },
        cwd,
      ),
    ).toEqual(['▸ site/layout.eta changed', '   All pages rebuilt in 90ms']);
  });

  it('says how long a build took when no page used the template but another file changed', () => {
    expect(
      describeRebuild(
        [change('/project/site/partials/unused.eta', 'change', 'template')],
        { templateResult: templates('none'), rebuild: 'incremental', durationMs: 7 },
        cwd,
      ),
    ).toEqual(['▸ site/partials/unused.eta changed', '   Done in 7ms']);
  });

  it('says that no page uses a changed template, or used a deleted one', () => {
    expect(
      describeRebuild(
        [
          change('/project/site/partials/unused.eta', 'change', 'template'),
          change('/project/site/partials/gone.eta', 'unlink', 'template'),
        ],
        { templateResult: templates('none'), rebuild: 'none', durationMs: 1 },
        cwd,
      ),
    ).toEqual([
      '▸ site/partials/unused.eta changed',
      '   No page uses it',
      '▸ site/partials/gone.eta deleted',
      '   No page used it',
    ]);
  });
});

describe('createRebuildLogger', () => {
  function createLogger(): Logger & Record<string, ReturnType<typeof vi.fn>> {
    return {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      status: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
      startProgress: vi.fn(),
      updateProgress: vi.fn(),
      endProgress: vi.fn(),
    };
  }

  it("passes on the build's errors and warnings, and nothing else", () => {
    const logger = createLogger();
    const rebuildLogger = createRebuildLogger(logger, false);

    for (const method of [
      'info',
      'success',
      'status',
      'building',
      'processing',
      'stats',
    ] as const) {
      rebuildLogger[method]('build output');
    }
    rebuildLogger.warning('a warning');
    rebuildLogger.error('an error');

    expect(logger.warning).toHaveBeenCalledExactlyOnceWith('a warning');
    expect(logger.error).toHaveBeenCalledExactlyOnceWith('an error');
    for (const method of ['info', 'success', 'status', 'building', 'processing', 'stats']) {
      expect(logger[method]).not.toHaveBeenCalled();
    }
    expect(rebuildLogger.startProgress).toBeUndefined();
  });

  it('shows the progress of a build when asked to', () => {
    const logger = createLogger();
    const rebuildLogger = createRebuildLogger(logger, true);

    expect(rebuildLogger.startProgress).toBe(logger.startProgress);
    expect(rebuildLogger.updateProgress).toBe(logger.updateProgress);
    expect(rebuildLogger.endProgress).toBe(logger.endProgress);
  });

  it('works with a logger that has no progress, errors or warnings', () => {
    const rebuildLogger = createRebuildLogger({ info: vi.fn() } as unknown as Logger, true);

    expect(rebuildLogger.startProgress).toBeUndefined();
    expect(() => rebuildLogger.error('an error')).not.toThrow();
    expect(() => rebuildLogger.warning('a warning')).not.toThrow();
  });
});
