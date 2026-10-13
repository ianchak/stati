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

  return `
<!-- Stati Development Error Overlay -->
<div style="
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999999;
  background: #dc2626;
  color: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  max-width: 400px;
  border: 2px solid #fca5a5;
">
  <div style="font-weight: 600; margin-bottom: 8px; font-size: 16px;">
    ⚠️ Template Error
  </div>
  <div style="margin-bottom: 8px;">
    <strong>Partial "${partialName}" not found</strong>
  </div>
  <div style="color: #fca5a5; font-size: 13px;">
    ${suggestionText}
  </div>
  <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #fca5a5; font-size: 12px; opacity: 0.8;">
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
