/**
 * Utility functions for Eta templates
 */

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
      classes.push(String(arg));
    } else if (Array.isArray(arg)) {
      classes.push(
        ...arg
          .filter((item) => item && (typeof item === 'string' || typeof item === 'number'))
          .map(String),
      );
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}
