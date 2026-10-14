import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Eta } from 'eta';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseEtaError, TemplateError } from '../../src/core/utils/template-errors.utils.js';
import { createValidatingContextProxy } from '../../src/core/utils/context-validation.utils.js';
import { wrapPartialsAsCallable } from '../../src/core/utils/callable-partials.utils.js';
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
      '<main>\n<%~ stati.partials.card({ title: "x" }) %>\n</main>',
    );
    await writeFile(join(viewsDir, 'card.eta'), '<div>\n  <%= stati.fromatDate(1) %>\n</div>');
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

  it('reports the innermost template when a partial called with props fails', async () => {
    const baseContext = { page: {}, site: {}, formatDate: () => '' };
    const partials = wrapPartialsAsCallable(
      eta,
      { card: '' },
      { card: 'card.eta' }, // Stati passes partial paths relative to the views directory
      baseContext,
    );
    const context = createValidatingContextProxy({ ...baseContext, partials });
    const error = await captureRenderError(eta, 'uses-card.eta', context);

    const templateError = parseEtaError(error);
    expect(templateError.filePath).toBe(join(viewsDir, 'card.eta'));
    expect(templateError.line).toBe(2);
    expect(templateError.suggestions).toEqual(['Did you mean "stati.formatDate"?']);
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
