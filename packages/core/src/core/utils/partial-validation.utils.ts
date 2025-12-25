import { isProduction } from '../../env.js';
import { type CallablePartial } from './callable-partials.utils.js';

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
 * Finds similar partial names to suggest when a partial is not found
 */
function findSimilarPartialNames(targetName: string, availableNames: string[]): string[] {
  if (availableNames.length === 0) return [];

  // Simple similarity check based on common prefixes and substrings
  const target = targetName.toLowerCase();

  const suggestions = availableNames
    .map((name) => {
      const candidate = name.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (candidate === target) return { name, score: 1000 };

      // Check if one is contained in the other
      if (candidate.includes(target) || target.includes(candidate)) {
        score += 100;
      }

      // Check common prefix length
      let prefixLen = 0;
      for (let i = 0; i < Math.min(target.length, candidate.length); i++) {
        if (target[i] === candidate[i]) {
          prefixLen++;
        } else {
          break;
        }
      }
      score += prefixLen * 10;

      // Check common characters
      const targetChars = new Set(target);
      const candidateChars = new Set(candidate);
      const commonChars = [...targetChars].filter((char) => candidateChars.has(char));
      score += commonChars.length;

      return { name, score };
    })
    .filter((item) => item.score > 0) // Only include items with some similarity
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 3) // Top 3 suggestions
    .map((item) => item.name);

  return suggestions;
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
      // Allow normal object operations
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }

      const propName = String(prop);

      // Check if the property exists
      if (propName in target) {
        return target[propName];
      }

      // Special case: allow accessing length, toString, etc.
      // Also handle test framework inspection properties
      if (
        propName in Object.prototype ||
        propName === 'length' ||
        propName === 'constructor' ||
        propName === 'then' || // Promise detection
        propName === '$$typeof' || // React inspection
        propName === 'nodeType' || // DOM node detection
        propName === 'asymmetricMatch' || // Jest/Vitest matcher
        propName === 'toJSON' // JSON serialization
      ) {
        return Reflect.get(target, prop, receiver);
      }

      // Property doesn't exist - return error overlay HTML instead of throwing
      const availablePartials = Object.keys(target);
      const suggestions = findSimilarPartialNames(propName, availablePartials);

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
