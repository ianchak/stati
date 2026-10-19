import { afterEach, describe, expect, it, vi } from 'vitest';
import { Eta } from 'eta';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  ETA_LAYOUT_DECLARATION,
  createStatiEtaPlugin,
  describeBlockedCall,
  installEtaPlugin,
} from '../../src/core/eta-plugin.js';
import { RenderScope, runInRenderScope } from '../../src/core/template-render.js';
import { TemplateIndex } from '../../src/core/template-index.js';
import { TemplateUsageError } from '../../src/core/utils/template-errors.utils.js';
import { setEnv } from '../../src/env.js';

const etaVersion = (
  JSON.parse(readFileSync(createRequire(import.meta.url).resolve('eta/package.json'), 'utf-8')) as {
    version: string;
  }
).version;

function engine(debug = false): Eta {
  const eta = new Eta({ varName: 'stati', debug, plugins: [createStatiEtaPlugin()] });
  installEtaPlugin(eta);
  return eta;
}

describe('Stati Eta plugin', () => {
  afterEach(() => {
    setEnv('test');
  });

  it(`finds the layout() declaration it anchors on in the installed Eta (${etaVersion})`, () => {
    for (const debug of [false, true]) {
      const plain = new Eta({ varName: 'stati', debug });
      expect(plain.compileToString('<p>x</p>', {})).toContain(ETA_LAYOUT_DECLARATION);
    }
  });

  it("replaces Eta's functions at the start of the template's own code", () => {
    for (const debug of [false, true]) {
      const compiled = engine(debug).compileToString('<p><%= stati.x %></p>', {});
      for (const name of ['include', 'includeAsync', 'layout', 'block', 'blockAsync']) {
        expect(compiled).toContain(
          `${name} = (...__statiArgs) => this.__statiBlockedEtaCall('${name}'`,
        );
      }
      // The template's code runs in a block of its own, after the replacements
      const start = compiled.indexOf('blockAsync = (...__statiArgs)');
      expect(compiled.slice(start)).toMatch(/filepath\); \{\n__eta\.res\+='<p>'/);
      expect(compiled).toMatch(/\n\}\n\nif \(__eta\.layout\)/);
      expect(compiled.indexOf('__eta.e(stati.x)')).toBeGreaterThan(start);
      if (debug) {
        // With debug on, Eta 4 declares block() inside its try block: the replacements must too
        expect(compiled.indexOf('try {')).toBeLessThan(start);
      }
    }
  });

  it('renders tags that start with a parenthesis or a bracket with debug on', () => {
    // Each tag ends its statement; only the line markers Eta adds between them could continue one
    const template =
      '<% (stati.tags ?? []).forEach((tag) => { %><%= tag %>,<% }); %>' +
      '<% [1, 2].forEach((n) => { %><%= n %><% }); %>' +
      '<% `${stati.tags.length}`.length && (stati.count = 1) %><%= stati.count %>';
    for (const debug of [false, true]) {
      expect(engine(debug).renderString(template, { tags: ['a', 'b'] })).toBe('a,b,121');
    }
  });

  it('fails when the compiled template no longer has the anchor', () => {
    const plugin = createStatiEtaPlugin();
    expect(() => plugin.processFnString!('let include = () => 1;', {} as never)).toThrow(
      "Stati could not find Eta's layout() function",
    );

    const eta = new Eta({ varName: 'stati', plugins: [plugin] });
    eta.compileToString = (() => plugin.processFnString!('return "";', eta.config)) as never;
    expect(() => installEtaPlugin(eta)).toThrow('This Eta version is not supported');
  });

  it("suggests the Stati call that keeps Eta's resolution of the name", () => {
    expect(describeBlockedCall('include', ['x']).suggestion).toBe("Use stati.include('./x')");
    expect(describeBlockedCall('include', ['partials/x.eta', {}]).suggestion).toBe(
      "Use stati.include('./partials/x', data)",
    );
    expect(describeBlockedCall('include', ['/x', undefined]).suggestion).toBe(
      "Use stati.include('/x')",
    );
    expect(describeBlockedCall('includeAsync', ['../x']).message).toContain(
      "Use stati.include('../x') instead; templates rendered by stati.include() render synchronously",
    );
    expect(describeBlockedCall('layout', ['base', { a: 1 }]).message).toBe(
      "Eta's layout() is not available in Stati templates. Use stati.layout('./base', data) instead; the data arrives as stati.props.",
    );
    expect(describeBlockedCall('block', ['x']).suggestion).toBe(
      'Pass the content to the layout as a prop',
    );
    expect(describeBlockedCall('include', [42]).suggestion).toBe("Use stati.include('path')");
    // The name is written as a single-quoted string; backslashes count as separators
    expect(describeBlockedCall('include', ["it's"]).suggestion).toBe(
      "Use stati.include('./it\\'s')",
    );
    expect(describeBlockedCall('include', ['partials\\card']).suggestion).toBe(
      "Use stati.include('./partials/card')",
    );
  });

  it('throws in development, which Eta reports at the calling line', () => {
    setEnv('development');
    let error: unknown;
    try {
      engine(true).renderString("<p>\n<%~ include('card') %>\n</p>", {});
    } catch (caught) {
      error = caught;
    }

    expect((error as Error).message).toMatch(/^line 2\n/);
    expect((error as Error).cause).toBeInstanceOf(TemplateUsageError);
    expect(((error as Error).cause as TemplateUsageError).suggestions).toEqual([
      "Use stati.include('./card')",
    ]);
  });

  it('logs in production and renders nothing', async () => {
    setEnv('production');
    const eta = engine();
    const logger = {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      status: vi.fn(),
      building: vi.fn(),
      processing: vi.fn(),
      stats: vi.fn(),
    };
    const scope = new RenderScope({
      page: { slug: '/x', url: '/x', sourcePath: '/site/x.md', frontMatter: {}, content: '' },
      eta,
      index: new TemplateIndex('/site', []),
      logger,
      development: false,
    });

    const html = await runInRenderScope(scope, async () =>
      eta.renderString("[<%~ include('card') %><% layout('base') %>]", {}),
    );

    expect(html).toBe('[]');
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "Eta's include() is not available in Stati templates. Use stati.include('./card') instead.",
      ),
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('(page /x)'));
  });

  it('falls back to the console outside a page render', () => {
    setEnv('production');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(engine().renderString("[<%~ include('card') %>]", {})).toBe('[]');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("Eta's include()"));
  });
});
