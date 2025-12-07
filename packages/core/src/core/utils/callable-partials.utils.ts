import { Eta } from 'eta';

/**
 * Type definition for a callable partial function.
 * Can be called with optional props or used directly as a value.
 */
export type CallablePartial = {
  (props?: Record<string, unknown>): string;
  toString(): string;
  valueOf(): string;
};

/**
 * Creates a callable partial that can be used both as a value and as a function.
 * This enables both syntaxes:
 * - Direct usage: <%~ stati.partials.header %>
 * - With props: <%~ stati.partials.hero({ title: 'Hello' }) %>
 *
 * @param eta - The Eta template engine instance
 * @param partialPath - Absolute path to the partial template file
 * @param baseContext - The base template context (without props)
 * @param renderedContent - Pre-rendered content for the no-props case
 * @returns A callable partial function
 *
 * @example
 * ```typescript
 * const callable = makeCallablePartial(eta, '/path/to/partial.eta', baseContext, '<div>Header</div>');
 *
 * // Use without props (returns pre-rendered content)
 * const html1 = callable.toString(); // '<div>Header</div>'
 *
 * // Use with props (re-renders with merged context)
 * const html2 = callable({ title: 'Custom Title' }); // Renders with custom props
 * ```
 */
export function makeCallablePartial(
  eta: Eta,
  partialPath: string,
  baseContext: Record<string, unknown>,
  renderedContent: string,
): CallablePartial {
  /**
   * The main callable function.
   * When called with props, re-renders the partial with merged context.
   * When called without props, returns the pre-rendered content.
   */
  const callable = (props?: Record<string, unknown>): string => {
    if (!props || Object.keys(props).length === 0) {
      // No props provided - return pre-rendered content
      return renderedContent;
    }

    // Props provided - re-render with merged context
    try {
      const mergedContext = {
        ...baseContext,
        props, // Make props available as stati.props
      };

      // Render the partial with the merged context using renderAsync
      // This is a synchronous call despite the name when used with already-loaded templates
      const result = eta.render(partialPath, mergedContext);
      return result || '';
    } catch (error) {
      console.error(`Error rendering callable partial ${partialPath} with props:`, error);
      return `<!-- Error rendering partial with props: ${error instanceof Error ? error.message : String(error)} -->`;
    }
  };

  // Create a Proxy to handle different usage patterns
  const proxy = new Proxy(callable, {
    /**
     * Handle function calls: stati.partials.header({ props })
     */
    apply(target, thisArg, args: [Record<string, unknown>?]) {
      return target.apply(thisArg, args);
    },

    /**
     * Handle toString(): When used in template interpolation without parentheses
     * Example: <%~ stati.partials.header %>
     */
    get(target, prop) {
      if (prop === 'toString' || prop === 'valueOf') {
        return () => renderedContent;
      }

      // Allow other function properties to pass through
      return Reflect.get(target, prop);
    },
  });

  return proxy as CallablePartial;
}

/**
 * Wraps all partials in a record with callable partial wrappers.
 * This allows partials to be used both as values and as functions.
 *
 * @param eta - The Eta template engine instance
 * @param partials - Record mapping partial names to their rendered content
 * @param partialPaths - Record mapping partial names to their absolute file paths
 * @param baseContext - The base template context (without props)
 * @returns Record of callable partials
 *
 * @example
 * ```typescript
 * const callablePartials = wrapPartialsAsCallable(
 *   eta,
 *   { header: '<div>Header</div>', footer: '<div>Footer</div>' },
 *   { header: '/path/to/header.eta', footer: '/path/to/footer.eta' },
 *   baseContext
 * );
 *
 * // Both syntaxes work
 * callablePartials.header.toString(); // Direct usage
 * callablePartials.header({ title: 'Custom' }); // With props
 * ```
 */
export function wrapPartialsAsCallable(
  eta: Eta,
  partials: Record<string, string>,
  partialPaths: Record<string, string>,
  baseContext: Record<string, unknown>,
): Record<string, CallablePartial> {
  const callablePartials: Record<string, CallablePartial> = {};

  // Create a context that will have partials updated to the callable versions
  // This enables nested callable partial calls
  const contextWithCallablePartials: Record<string, unknown> = {
    ...baseContext,
    // The partials property will be updated after all callables are created
    get partials() {
      return callablePartials;
    },
  };

  for (const [name, renderedContent] of Object.entries(partials)) {
    const partialPath = partialPaths[name];
    if (!partialPath) {
      console.warn(`No path found for partial "${name}", skipping callable wrapper`);
      continue;
    }

    // Pass the context that has dynamic access to all callable partials
    callablePartials[name] = makeCallablePartial(
      eta,
      partialPath,
      contextWithCallablePartials,
      renderedContent,
    );
  }

  return callablePartials;
}
