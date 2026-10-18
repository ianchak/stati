import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createValidatingContextProxy,
  parseUnknownPropertyMessage,
  UnknownTemplatePropertyError,
} from '../../src/core/utils/context-validation.utils.js';
import { setEnv, getEnv } from '../../src/env.js';

function createContext() {
  return {
    site: { title: 'Test Site', baseUrl: 'https://example.com' },
    page: { title: 'Home', url: '/', customField: 'x' },
    content: '<p>Hi</p>',
    nav: { tree: [], getBreadcrumbs: () => [] },
    collection: undefined,
    generator: { version: '1.0.0' },
    props: undefined,
    propValue: () => '',
    helpers: {
      formatDate: () => '2026-01-01',
      formatTwice(this: Record<string, () => string>) {
        return `${this.formatDate!()} ${this.formatDate!()}`;
      },
      callMissing(this: Record<string, () => string>) {
        return this.formatDat!();
      },
    },
  };
}

function captureError(fn: () => unknown): UnknownTemplatePropertyError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(UnknownTemplatePropertyError);
    return error as UnknownTemplatePropertyError;
  }
  throw new Error('Expected an UnknownTemplatePropertyError to be thrown');
}

describe('createValidatingContextProxy', () => {
  let originalEnv: ReturnType<typeof getEnv>;

  beforeEach(() => {
    originalEnv = getEnv();
    setEnv('development');
  });

  afterEach(() => {
    setEnv(originalEnv);
  });

  it('returns the context unchanged outside development', () => {
    for (const env of ['production', 'test'] as const) {
      setEnv(env);
      const context = createContext();
      expect(createValidatingContextProxy(context)).toBe(context);
    }
  });

  it('returns existing properties, including helpers', () => {
    const stati = createValidatingContextProxy(createContext());
    expect(stati.content).toBe('<p>Hi</p>');
    expect(stati.helpers.formatDate()).toBe('2026-01-01');
    expect(stati.collection).toBeUndefined();
  });

  it('throws with a suggestion for a misspelled top-level property', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string, unknown>;
    const error = captureError(() => stati.paeg);

    expect(error.propertyPath).toBe('stati.paeg');
    expect(error.suggestions).toEqual(['stati.page']);
    expect(error.message).toBe('Unknown property "stati.paeg". Did you mean "stati.page"?');
  });

  it('suggests a matching key one level down first', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string, unknown>;
    expect(captureError(() => stati.title).suggestions[0]).toBe('stati.page.title');
    expect(captureError(() => stati.customField).suggestions).toEqual(['stati.page.customField']);
    expect(captureError(() => stati.formatDate).suggestions).toEqual(['stati.helpers.formatDate']);
  });

  it('lists the available properties when nothing is similar', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string, unknown>;
    const error = captureError(() => stati.zzz);

    expect(error.suggestions).toEqual([]);
    expect(error.message).toContain('Available properties: collection, content,');
  });

  it('validates nested closed objects', () => {
    const stati = createValidatingContextProxy(createContext());

    const navError = captureError(() => (stati.nav as Record<string, unknown>).getBreadcrumb);
    expect(navError.propertyPath).toBe('stati.nav.getBreadcrumb');
    expect(navError.suggestions).toEqual(['stati.nav.getBreadcrumbs']);

    const generatorError = captureError(() => (stati.generator as Record<string, unknown>).versoin);
    expect(generatorError.suggestions).toEqual(['stati.generator.version']);
  });

  it('validates helpers as a closed set', () => {
    const stati = createValidatingContextProxy(createContext());
    const helpers = stati.helpers as Record<string, unknown>;

    const error = captureError(() => helpers.fromatDate);
    expect(error.propertyPath).toBe('stati.helpers.fromatDate');
    expect(error.suggestions).toEqual(['stati.helpers.formatDate']);

    const empty = createValidatingContextProxy({ ...createContext(), helpers: {} });
    expect(captureError(() => (empty.helpers as Record<string, unknown>).anything).message).toBe(
      'Unknown property "stati.helpers.anything". Available properties: .',
    );
  });

  it('calls a helper with the validating helpers object as this', () => {
    const stati = createValidatingContextProxy(createContext());

    expect(stati.helpers.formatTwice()).toBe('2026-01-01 2026-01-01');
    expect(captureError(() => stati.helpers.callMissing()).suggestions).toEqual([
      'stati.helpers.formatDate',
    ]);
  });

  it('explains stati.body in a template that has none', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string, unknown>;
    const error = captureError(() => stati.body);

    expect(error.propertyPath).toBe('stati.body');
    expect(error.message).toContain(
      'stati.body is set only in templates rendered by stati.layout()',
    );
    expect(error.message).toContain('stati.content');
    expect(parseUnknownPropertyMessage(error.message)).toEqual({
      message: 'Unknown property "stati.body"',
      suggestions: [error.suggestions[0]],
    });

    const withBody = createValidatingContextProxy({ ...createContext(), body: undefined });
    expect(withBody.body).toBeUndefined();
  });

  it('allows optional SiteConfig fields that are not set', () => {
    const stati = createValidatingContextProxy(createContext());
    const site = stati.site as Record<string, unknown>;

    expect(site.description).toBeUndefined();
    expect(site.defaultLocale).toBeUndefined();
    expect(captureError(() => site.titel).suggestions).toEqual(['stati.site.title']);
  });

  it('does not validate frontmatter under stati.page', () => {
    const stati = createValidatingContextProxy(createContext());
    expect((stati.page as Record<string, unknown>).notInFrontmatter).toBeUndefined();
  });

  it('returns the same nested proxy on every read', () => {
    const stati = createValidatingContextProxy(createContext());
    expect(stati.nav).toBe(stati.nav);
  });

  it('supports optional chaining on props and the in operator', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string, unknown>;
    const props = stati.props as { title?: string } | undefined;

    expect(props?.title ?? 'fallback').toBe('fallback');
    expect('helpers' in stati).toBe(true);
    expect('missing' in stati).toBe(false);
  });

  it('lets symbols, prototype methods, and probes through', () => {
    const stati = createValidatingContextProxy(createContext()) as Record<string | symbol, unknown>;

    expect(stati[Symbol.iterator]).toBeUndefined();
    expect(typeof stati.hasOwnProperty).toBe('function');
    expect(stati.then).toBeUndefined();
    expect(stati.toJSON).toBeUndefined();
  });

  it('supports spreading and key enumeration', () => {
    const context = createContext();
    const stati = createValidatingContextProxy(context);

    expect(Object.keys(stati)).toEqual(Object.keys(context));
    expect({ ...stati, body: 'x' }.body).toBe('x');
  });
});

describe('parseUnknownPropertyMessage', () => {
  it('turns suggestions into overlay entries', () => {
    expect(
      parseUnknownPropertyMessage(
        'Unknown property "stati.paeg". Did you mean "stati.page" or "stati.props"?',
      ),
    ).toEqual({
      message: 'Unknown property "stati.paeg"',
      suggestions: ['Did you mean "stati.page"?', 'Did you mean "stati.props"?'],
    });
  });

  it('turns the available properties into an overlay entry', () => {
    expect(
      parseUnknownPropertyMessage(
        'Unknown property "stati.nav.zzz". Available properties: getTree, tree.',
      ),
    ).toEqual({
      message: 'Unknown property "stati.nav.zzz"',
      suggestions: ['Available properties on stati.nav: getTree, tree'],
    });
  });

  it('round-trips messages built by UnknownTemplatePropertyError', () => {
    const error = new UnknownTemplatePropertyError(
      'stati.x',
      ['stati.a', 'stati.b', 'stati.c'],
      [],
    );
    expect(parseUnknownPropertyMessage(error.message)?.suggestions).toEqual([
      'Did you mean "stati.a"?',
      'Did you mean "stati.b"?',
      'Did you mean "stati.c"?',
    ]);
  });

  it('ignores other messages', () => {
    expect(parseUnknownPropertyMessage('Cannot read properties of undefined')).toBeUndefined();
  });
});
