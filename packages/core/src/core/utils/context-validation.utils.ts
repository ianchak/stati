import { isDevelopment } from '../../env.js';
import type { SiteConfig } from '../../types/index.js';
import { findSimilarNames } from './similarity.utils.js';

/**
 * Properties that must resolve normally even when they are not defined on the
 * object, because the runtime, serializers, or test tooling probe for them.
 */
const PASSTHROUGH_PROPERTIES = new Set([
  'length',
  'constructor',
  'then', // Promise detection
  '$$typeof', // React inspection
  'nodeType', // DOM node detection
  'asymmetricMatch', // Jest/Vitest matcher
  'toJSON', // JSON serialization
]);

/**
 * Checks whether a property access should bypass validation.
 */
export function isPassthroughProperty(prop: string | symbol): boolean {
  return typeof prop === 'symbol' || prop in Object.prototype || PASSTHROUGH_PROPERTIES.has(prop);
}

/**
 * Every `SiteConfig` field. Optional fields that a site leaves unset are absent at
 * runtime, so they are listed here to keep `stati.site.description` from being
 * reported as unknown. Typed as a Record so a new `SiteConfig` field fails to compile
 * until it is added.
 */
const SITE_CONFIG_KEYS: Record<keyof SiteConfig, true> = {
  title: true,
  baseUrl: true,
  defaultLocale: true,
  description: true,
};

/**
 * Context properties whose own keys form a closed set and are validated one level
 * down, with keys that may be legitimately absent at runtime.
 * `page` is left out because frontmatter keys differ from page to page.
 */
const VALIDATED_NESTED_PROPERTIES: Record<string, readonly string[]> = {
  site: Object.keys(SITE_CONFIG_KEYS),
  nav: [],
  collection: [],
  generator: [],
  helpers: [],
};

/**
 * Context properties searched for an exact match when a key is missing from the
 * root, so that `stati.title` can suggest `stati.page.title` and `stati.formatDate`
 * can suggest `stati.helpers.formatDate`.
 */
const CROSS_LEVEL_PROPERTIES = ['page', 'site', 'nav', 'helpers'];

/**
 * Explanations for root properties that exist only in some templates, shown instead of
 * spelling suggestions when a template reads one where it is absent.
 */
const ABSENT_PROPERTY_HINTS: Record<string, string> = {
  body: "stati.body is set only in templates rendered by stati.layout() or stati.include(); the page's Markdown is stati.content",
};

/**
 * Thrown in development when a template reads a property that does not exist
 * on the template context.
 *
 * The suggestions are encoded in the message because Eta's debug mode rethrows
 * runtime errors as a new error that only keeps the original message and name.
 * Use {@link parseUnknownPropertyMessage} to read them back.
 */
export class UnknownTemplatePropertyError extends Error {
  public readonly propertyPath: string;
  public readonly suggestions: string[];

  /**
   * @param hint - Explanation shown instead of the suggestions, for a property that only some
   *   templates have
   */
  constructor(propertyPath: string, suggestions: string[], availableKeys: string[], hint?: string) {
    super(formatUnknownPropertyMessage(propertyPath, suggestions, availableKeys, hint));
    this.name = 'UnknownTemplatePropertyError';
    this.propertyPath = propertyPath;
    this.suggestions = hint ? [hint] : suggestions;
  }
}

function formatUnknownPropertyMessage(
  propertyPath: string,
  suggestions: string[],
  availableKeys: string[],
  hint?: string,
): string {
  const base = `Unknown property "${propertyPath}".`;
  if (hint) {
    return `${base} ${hint}.`;
  }
  if (suggestions.length > 0) {
    const quoted = suggestions.map((s) => `"${s}"`);
    const list =
      quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(', ')} or ${quoted.at(-1)}`;
    return `${base} Did you mean ${list}?`;
  }
  return `${base} Available properties: ${availableKeys.join(', ')}.`;
}

/**
 * Reads an {@link UnknownTemplatePropertyError} message back into a short message
 * and a list of overlay suggestions. Returns `undefined` for any other message.
 *
 * @example
 * ```typescript
 * parseUnknownPropertyMessage('Unknown property "stati.paeg". Did you mean "stati.page"?');
 * // { message: 'Unknown property "stati.paeg"', suggestions: ['Did you mean "stati.page"?'] }
 * ```
 */
export function parseUnknownPropertyMessage(
  message: string,
): { message: string; suggestions: string[] } | undefined {
  const match = message.match(
    /^Unknown property "([^"]+)"\.(?: Did you mean (.+)\?| Available properties: (.*)\.| (.+)\.)?$/,
  );
  if (!match) {
    return undefined;
  }

  const [, propertyPath, didYouMean, available, hint] = match;
  const suggestions: string[] = [];
  if (didYouMean) {
    for (const [, name] of didYouMean.matchAll(/"([^"]+)"/g)) {
      suggestions.push(`Did you mean "${name}"?`);
    }
  } else if (available !== undefined) {
    const parentPath = propertyPath!.slice(0, propertyPath!.lastIndexOf('.'));
    suggestions.push(`Available properties on ${parentPath}: ${available || '(none)'}`);
  } else if (hint) {
    suggestions.push(hint);
  }

  return { message: `Unknown property "${propertyPath}"`, suggestions };
}

function listKeys(target: object, extraKeys: readonly string[]): string[] {
  return [...new Set([...Object.keys(target), ...extraKeys])].sort();
}

function createValidatingObjectProxy<T extends object>(
  target: T,
  path: string,
  extraKeys: readonly string[],
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop in obj || isPassthroughProperty(prop) || extraKeys.includes(prop as string)) {
        return Reflect.get(obj, prop, receiver);
      }

      const name = String(prop);
      const availableKeys = listKeys(obj, extraKeys);
      const suggestions = findSimilarNames(name, availableKeys).map((key) => `${path}.${key}`);
      throw new UnknownTemplatePropertyError(`${path}.${name}`, suggestions, availableKeys);
    },
  });
}

/**
 * Wraps the template context so that reading a property that does not exist
 * throws an {@link UnknownTemplatePropertyError} with "did you mean" suggestions
 * instead of silently rendering `undefined`. The error reaches the dev server's
 * error overlay.
 *
 * Validates the top-level `stati.*` keys and one level down for `site`, `nav`,
 * `collection`, `generator` and `helpers`, so a misspelt helper is caught too.
 * Frontmatter under `stati.page` is not validated.
 *
 * Only active in development; other environments get the context back unchanged.
 */
export function createValidatingContextProxy<T extends object>(context: T): T {
  if (!isDevelopment()) {
    return context;
  }

  const nestedProxies = new Map<string, object>();

  return new Proxy(context, {
    get(obj, prop, receiver) {
      if (prop in obj || isPassthroughProperty(prop)) {
        const value: unknown = Reflect.get(obj, prop, receiver);
        const nestedExtraKeys =
          typeof prop === 'string' && Object.hasOwn(VALIDATED_NESTED_PROPERTIES, prop)
            ? VALIDATED_NESTED_PROPERTIES[prop]
            : undefined;

        if (nestedExtraKeys && typeof value === 'object' && value !== null) {
          // Cache so that repeated reads return the same proxy (stati.nav === stati.nav)
          let nested = nestedProxies.get(prop as string);
          if (!nested) {
            nested = createValidatingObjectProxy(value, `stati.${String(prop)}`, nestedExtraKeys);
            nestedProxies.set(prop as string, nested);
          }
          return nested;
        }
        return value;
      }

      const name = String(prop);
      const availableKeys = listKeys(obj, []);

      const hint = Object.hasOwn(ABSENT_PROPERTY_HINTS, name)
        ? ABSENT_PROPERTY_HINTS[name]
        : undefined;
      if (hint) {
        throw new UnknownTemplatePropertyError(`stati.${name}`, [], availableKeys, hint);
      }

      // An exact match one level down (stati.title -> stati.page.title) is a
      // stronger signal than a spelling match, so it goes first
      const suggestions: string[] = [];
      for (const parent of CROSS_LEVEL_PROPERTIES) {
        const parentValue = (obj as Record<string, unknown>)[parent];
        if (
          typeof parentValue === 'object' &&
          parentValue !== null &&
          Object.hasOwn(parentValue, name)
        ) {
          suggestions.push(`stati.${parent}.${name}`);
        }
      }
      suggestions.push(...findSimilarNames(name, availableKeys).map((key) => `stati.${key}`));

      throw new UnknownTemplatePropertyError(
        `stati.${name}`,
        suggestions.slice(0, 3),
        availableKeys,
      );
    },
  });
}
