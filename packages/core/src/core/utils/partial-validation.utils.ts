import { isProduction } from '../../env.js';
import { type CallablePartial } from './callable-partials.utils.js';
import { isPassthroughProperty } from './context-validation.utils.js';
import { findSimilarNames } from './similarity.utils.js';

/**
 * Creates inline error overlay HTML for missing partials
 */
function createInlineErrorOverlay(partialName: string, suggestions: string[]): string {
  const suggestionText =
    suggestions.length > 0
      ? `Did you mean: ${suggestions.map((s) => `"${s}"`).join(', ')}?`
      : 'No similar partials found';

  // Inline styles only: this toast is injected into the user's own page, so it
  // carries the Stati dark slate palette rather than relying on page styles.
  return `
<!-- Stati Development Error Overlay -->
<div role="alert" style="
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
  box-sizing: border-box;
  width: min(24rem, calc(100vw - 32px));
  margin: 0;
  padding: 14px 16px;
  background: #0f172a;
  color: #f1f5f9;
  border: 1px solid #475569;
  border-radius: 8px;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  text-align: left;
">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #f87171;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none;"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
    Template Error
  </div>
  <div style="font-weight: 600; overflow-wrap: anywhere;">
    Partial "${partialName}" not found
  </div>
  <div style="margin-top: 2px; font-size: 13px; color: #94a3b8; overflow-wrap: anywhere;">
    ${suggestionText}
  </div>
  <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #1e293b; font-size: 12px; color: #8391a7;">
    Fix the partial name in your template to dismiss this error
  </div>
</div>
<!-- End Stati Error Overlay -->`;
}

/**
 * Creates a development-mode Proxy for the partials object that throws errors
 * when accessing non-existent partials instead of returning undefined.
 *
 * Supports both string partials and CallablePartial.
 */
export function createValidatingPartialsProxy<T extends string | CallablePartial>(
  partials: Record<string, T>,
): Record<string, T> {
  // In production, return partials as-is
  // Only skip validation if explicitly set to production
  if (isProduction()) {
    return partials;
  }

  // If there are no partials, return the empty object as-is
  // This avoids proxy-related issues during test serialization
  if (Object.keys(partials).length === 0) {
    return partials;
  }

  return new Proxy(partials, {
    get(target, prop, receiver) {
      const propName = String(prop);

      // Return existing partials, and let symbols, prototype methods, and
      // serializer/test-tooling probes resolve normally
      if (propName in target || isPassthroughProperty(prop)) {
        return Reflect.get(target, prop, receiver);
      }

      // Property doesn't exist - return error overlay HTML instead of throwing
      const availablePartials = Object.keys(target);
      const suggestions = findSimilarNames(propName, availablePartials);

      // In development, render an inline error overlay
      const errorHtml = createInlineErrorOverlay(propName, suggestions);

      // Check if we're dealing with CallablePartials by testing a known partial
      const samplePartial = Object.values(target)[0];
      const isCallable = typeof samplePartial === 'function';

      if (isCallable) {
        // For CallablePartial, return a function that returns the error HTML
        // This prevents "string is not a function" errors when templates call missing partials
        // Accept any arguments to handle props being passed
        const errorFunction = (..._args: unknown[]) => errorHtml;
        errorFunction.toString = () => errorHtml;
        errorFunction.valueOf = () => errorHtml;
        return errorFunction as T;
      } else {
        // For string partials, return the error HTML directly
        return errorHtml as T;
      }
    },

    has(target, prop) {
      return prop in target;
    },

    ownKeys(target) {
      return Reflect.ownKeys(target);
    },

    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}
