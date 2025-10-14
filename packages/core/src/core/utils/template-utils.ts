/**
 * Utility functions for Eta templates
 */

import { trackTailwindClass } from './tailwind-inventory.js';

type PropValueArg =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | string | number | null | undefined>
  | PropValueArg[];

/**
 * Builds a property value from various inputs, similar to classnames but for any property.
 * Accepts strings, arrays, and objects. Filters out falsy values.
 *
 * Also tracks Tailwind classes for the class inventory when inventory tracking is enabled.
 * This ensures dynamically-generated Tailwind classes are included in the CSS build.
 *
 * @param args - Values to combine
 * @returns Combined property value string
 *
 * @example
 * propValue('class1', 'class2') // 'class1 class2'
 * propValue(['class1', 'class2']) // 'class1 class2'
 * propValue({ 'class1': true, 'class2': false }) // 'class1'
 * propValue('class1', ['class2', 'class3'], { 'class4': true }) // 'class1 class2 class3 class4'
 */
export function propValue(...args: PropValueArg[]): string {
  const classes: string[] = [];

  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string' || typeof arg === 'number') {
      const classStr = String(arg);
      classes.push(classStr);

      // Track ALL classes for Tailwind inventory
      // Split space-separated classes and track each one individually
      const individualClasses = classStr.split(/\s+/).filter(Boolean);
      for (const cls of individualClasses) {
        trackTailwindClass(cls);
      }
    } else if (Array.isArray(arg)) {
      const arrayClasses = arg
        .filter((item) => item && (typeof item === 'string' || typeof item === 'number'))
        .map(String);

      classes.push(...arrayClasses);

      // Track each class for Tailwind inventory
      for (const classStr of arrayClasses) {
        const individualClasses = classStr.split(/\s+/).filter(Boolean);
        for (const cls of individualClasses) {
          trackTailwindClass(cls);
        }
      }
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        if (value) {
          classes.push(key);

          // Track for Tailwind inventory
          const individualClasses = key.split(/\s+/).filter(Boolean);
          for (const cls of individualClasses) {
            trackTailwindClass(cls);
          }
        }
      }
    }
  }

  return classes.join(' ');
}
