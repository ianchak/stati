import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Eta } from 'eta';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createTemplateError,
  parseEtaError,
  TemplateError,
} from '../../src/core/utils/template-errors.utils.js';
import { createValidatingContextProxy } from '../../src/core/utils/context-validation.utils.js';
import { createStatiEtaPlugin, installEtaPlugin } from '../../src/core/eta-plugin.js';
import { TemplateIndex } from '../../src/core/template-index.js';
import { RenderScope, type BaseContext } from '../../src/core/template-render.js';
import { createFallbackLogger } from '../../src/core/utils/logger.utils.js';
import { setEnv, getEnv } from '../../src/env.js';

async function captureRenderError(eta: Eta, template: string, data: object): Promise<Error> {
  try {
    await eta.renderAsync(template, data);
  } catch (error) {
    return error as Error;
  }
  throw new Error('Expected the template to throw');
}

describe('parseEtaError with Eta debug output', () => {
  let viewsDir: string;
  let eta: Eta;
  let originalEnv: ReturnType<typeof getEnv>;

  beforeAll(async () => {
    viewsDir = await mkdtemp(join(tmpdir(), 'stati-template-errors-'));
    await writeFile(
      join(viewsDir, 'layout.eta'),
      '<html>\n<head>\n<title><%= stati.paeg.title %></title>\n</head>\n</html>',
    );
    await writeFile(
      join(viewsDir, 'uses-card.eta'),
      '<main>\n<%~ stati.include("card", { title: "x" }) %>\n</main>',
    );
    await writeFile(
      join(viewsDir, 'card.eta'),
      '<div>\n  <%= stati.helpers.fromatDate(1) %>\n</div>',
    );
    await writeFile(
      join(viewsDir, 'uses-broken.eta'),
      '<main>\n<%~ stati.include("broken") %>\n</main>',
    );
    await writeFile(join(viewsDir, 'broken.eta'), '<p>\n<%= stati.page.title\n</p>');
    await writeFile(join(viewsDir, 'uses-it.eta'), '<p><%= it.page.title %></p>');
  });

  afterAll(async () => {
    await rm(viewsDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    originalEnv = getEnv();
    setEnv('development');
    eta = new Eta({ views: viewsDir, varName: 'stati', debug: true });
  });

  afterEach(() => {
    setEnv(originalEnv);
  });

  it('extracts the template path, line, and did-you-mean suggestions', async () => {
    const context = createValidatingContextProxy({ page: { title: 'Home' }, site: {} });
    const error = await captureRenderError(eta, 'layout.eta', context);

    const templateError = parseEtaError(error, 'fallback.eta');
    expect(templateError.filePath).toBe(join(viewsDir, 'layout.eta'));
    expect(templateError.line).toBe(3);
    expect(templateError.message).toBe('Unknown property "stati.paeg"');
    expect(templateError.suggestions).toEqual(['Did you mean "stati.page"?']);

    const details = await templateError.toErrorDetails();
    expect(details.suggestions?.[0]).toBe('Did you mean "stati.page"?');
    expect(details.code).toBe('<title><%= stati.paeg.title %></title>');
  });

  /** Renders a template the way a page's layout renders, with stati.include() available */
  async function captureScopeError(template: string): Promise<Error> {
    const engine = new Eta({
      views: viewsDir,
      varName: 'stati',
      debug: true,
      plugins: [createStatiEtaPlugin()],
    });
    installEtaPlugin(engine);
    const scope = new RenderScope({
      page: {
        slug: '/',
        url: '/',
        sourcePath: join(viewsDir, 'index.md'),
        frontMatter: {},
        content: '',
      },
      eta: engine,
      index: await TemplateIndex.load(viewsDir),
      logger: createFallbackLogger(),
      development: true,
    });
    // Only what the templates read
    const values = {
      page: {},
      site: {},
      helpers: { formatDate: () => '' },
    } as unknown as BaseContext['values'];
    try {
      await scope.renderAsync({ id: 'page', values }, { file: template });
    } catch (error) {
      return error as Error;
    }
    throw new Error('Expected the template to throw');
  }

  it('reports the innermost template when an included template fails', async () => {
    const error = await captureScopeError('uses-card.eta');

    const templateError = parseEtaError(error);
    expect(templateError.filePath).toBe(join(viewsDir, 'card.eta'));
    expect(templateError.line).toBe(2);
    expect(templateError.suggestions).toEqual(['Did you mean "stati.helpers.formatDate"?']);
  });

  it('points at an included template that does not compile, not at the include', async () => {
    const error = await captureScopeError('uses-broken.eta');

    const templateError = createTemplateError(error);
    expect(templateError.filePath).toBe(join(viewsDir, 'broken.eta'));
    expect(templateError.line).toBe(2);
    expect(templateError.message).toContain('broken.eta');
  });

  it('explains that templates use stati instead of it', async () => {
    const error = await captureRenderError(eta, 'uses-it.eta', { page: {} });

    const templateError = parseEtaError(error);
    expect(templateError.message).toBe('it is not defined');
    expect(templateError.suggestions?.[0]).toContain('use "stati" instead of Eta\'s default "it"');
  });

  it('suggests the stati prefix for a bare context name in a template without a path', () => {
    let error: Error | undefined;
    try {
      eta.renderString('<p>\n<%= page.title %>\n</p>', {});
    } catch (e) {
      error = e as Error;
    }

    const templateError = parseEtaError(error!, 'inline.eta');
    expect(templateError.filePath).toBe('inline.eta');
    expect(templateError.line).toBe(2);
    expect(templateError.message).toBe('page is not defined');
    expect(templateError.suggestions).toEqual(['Did you mean "stati.page"?']);
  });

  it.each([
    ['url', `<a href="<%= url('/about') %>">About</a>`],
    ['og', '<p><%= og.width %></p>'],
    ['ogImage', '<p><%= ogImage.url %></p>'],
  ])('suggests the stati prefix for a bare %s', (name, template) => {
    let error: Error | undefined;
    try {
      eta.renderString(template, {});
    } catch (e) {
      error = e as Error;
    }

    const templateError = parseEtaError(error!, 'inline.eta');
    expect(templateError.message).toBe(`${name} is not defined`);
    expect(templateError.suggestions).toEqual([`Did you mean "stati.${name}"?`]);
  });

  it.each(['version', 'config', 'tags', 'generatedImage', 'deferGeneratedImage'])(
    'gives no stati hint for %s, which is not a context property',
    (name) => {
      const templateError = parseEtaError(new ReferenceError(`${name} is not defined`));
      expect(templateError.suggestions).toEqual([]);
    },
  );

  it('reads the line and column of Eta syntax errors', () => {
    let error: Error | undefined;
    try {
      eta.renderString('<p>\n<%= stati.page.title', {});
    } catch (e) {
      error = e as Error;
    }

    const templateError = parseEtaError(error!, 'broken.eta');
    expect(templateError.filePath).toBe('broken.eta');
    expect(templateError.line).toBe(2);
    expect(templateError.column).toBe(1);
  });

  it('leaves errors without location information unchanged', () => {
    const templateError = parseEtaError(new Error('Something failed'), 'page.eta');
    expect(templateError).toBeInstanceOf(TemplateError);
    expect(templateError.message).toBe('Something failed');
    expect(templateError.filePath).toBe('page.eta');
    expect(templateError.line).toBeUndefined();
    expect(templateError.suggestions).toEqual([]);
  });
});
