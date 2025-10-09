/**
 * Tailwind Class Inventory Management
 *
 * Tracks Tailwind classes used in templates (especially dynamic ones) and generates
 * an HTML file that Tailwind can scan during its build process. This ensures that
 * dynamically constructed classes (e.g., `from-${color}-50`) are included in the
 * final CSS output.
 */

import { writeFile, ensureDir, pathExists, readFile } from './fs.js';
import { join } from 'path';

/**
 * Module-level Set to track Tailwind classes across template renders.
 * Cleared at the start of each full build.
 */
const tailwindClassInventory = new Set<string>();

/**
 * Flag to track if inventory tracking is enabled.
 * Only enabled during build/dev, not during production rendering.
 */
let inventoryTrackingEnabled = false;

/**
 * Cached result of Tailwind detection to avoid repeated file system checks.
 */
let tailwindDetected: boolean | null = null;

/**
 * Patterns that identify dynamic Tailwind classes worth tracking.
 * We only track classes that are likely to be dynamically generated,
 * as static classes are already picked up by Tailwind's content scanner.
 */
const DYNAMIC_CLASS_PATTERNS = [
  // Color utilities with shades
  /^(from|to|bg|text|border|ring|outline)-[a-z]+-(\d+|[\d]+\/[\d]+)$/,

  // Hover/focus/active/group variants with colors
  /^(hover|focus|active|group-hover|group-focus):(from|to|bg|text|border|ring)-[a-z]+-(\d+|[\d]+\/[\d]+)$/,

  // Dark mode variants
  /^dark:(from|to|bg|text|border|ring)-[a-z]+-(\d+|[\d]+\/[\d]+)$/,

  // Shadow utilities with colors
  /^(shadow|hover:shadow)-[a-z]+-(\d+|[\d]+\/[\d]+)$/,

  // Combined dark mode and state variants
  /^dark:(hover|focus|group-hover|group-focus):(from|to|bg|text|border|ring)-[a-z]+-(\d+|[\d]+\/[\d]+)$/,
];

/**
 * Detects if Tailwind CSS is being used in the project by checking for:
 * 1. tailwind.config.js or tailwind.config.ts
 * 2. tailwindcss in package.json dependencies
 *
 * Results are cached to avoid repeated file system checks.
 *
 * @param projectRoot - Root directory of the project (defaults to current working directory)
 * @returns True if Tailwind is detected, false otherwise
 */
export async function isTailwindUsed(projectRoot: string = process.cwd()): Promise<boolean> {
  // Return cached result if available
  if (tailwindDetected !== null) {
    return tailwindDetected;
  }

  // Check for tailwind.config.js or tailwind.config.ts
  const configExists =
    (await pathExists(join(projectRoot, 'tailwind.config.js'))) ||
    (await pathExists(join(projectRoot, 'tailwind.config.ts'))) ||
    (await pathExists(join(projectRoot, 'tailwind.config.mjs'))) ||
    (await pathExists(join(projectRoot, 'tailwind.config.cjs')));

  if (configExists) {
    tailwindDetected = true;
    return true;
  }

  // Check package.json for tailwindcss dependency
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const content = await readFile(packageJsonPath, 'utf-8');
      if (!content) {
        return false;
      }

      const packageJson = JSON.parse(content);
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps.tailwindcss) {
        tailwindDetected = true;
        return true;
      }
    }
  } catch {
    // Ignore errors reading package.json
  }

  tailwindDetected = false;
  return false;
}

/**
 * Resets the Tailwind detection cache.
 * Useful for testing or when project dependencies change.
 */
export function resetTailwindDetection(): void {
  tailwindDetected = null;
}

/**
 * Checks if a class name matches patterns for dynamic Tailwind classes.
 * Only dynamic classes need to be tracked; static ones are found by Tailwind's scanner.
 *
 * @param className - The class name to check
 * @returns True if the class should be tracked for the inventory
 */
export function shouldTrackForTailwind(className: string): boolean {
  return DYNAMIC_CLASS_PATTERNS.some((pattern) => pattern.test(className));
}

/**
 * Tracks a Tailwind class in the inventory.
 * Only tracks if inventory tracking is enabled.
 *
 * @param className - The class name to track
 */
export function trackTailwindClass(className: string): void {
  if (inventoryTrackingEnabled && className) {
    tailwindClassInventory.add(className);
  }
}

/**
 * Enables inventory tracking for the current build/dev session.
 * Should be called at the start of build or dev server.
 */
export function enableInventoryTracking(): void {
  inventoryTrackingEnabled = true;
}

/**
 * Disables inventory tracking.
 * Should be called after build completes or when stopping dev server.
 */
export function disableInventoryTracking(): void {
  inventoryTrackingEnabled = false;
}

/**
 * Clears the inventory.
 * Should be called at the start of each full build to ensure fresh tracking.
 */
export function clearInventory(): void {
  tailwindClassInventory.clear();
}

/**
 * Gets the current inventory as an array.
 * Useful for testing and debugging.
 *
 * @returns Array of tracked class names
 */
export function getInventory(): string[] {
  return Array.from(tailwindClassInventory).sort();
}

/**
 * Gets the count of tracked classes.
 *
 * @returns Number of classes in the inventory
 */
export function getInventorySize(): number {
  return tailwindClassInventory.size;
}

/**
 * Checks if inventory tracking is currently enabled.
 *
 * @returns True if tracking is enabled
 */
export function isTrackingEnabled(): boolean {
  return inventoryTrackingEnabled;
}

/**
 * Writes the Tailwind class inventory to an HTML file that Tailwind can scan.
 *
 * The generated file contains all tracked classes in a hidden div.
 * This file should be added to Tailwind's content configuration.
 *
 * @param cacheDir - Directory where the inventory file should be written (typically .stati/)
 * @returns Path to the generated inventory file
 *
 * @example
 * ```typescript
 * const inventoryPath = await writeTailwindClassInventory('/path/to/project/.stati');
 * // File written to: /path/to/project/.stati/tailwind-classes.html
 * ```
 */
export async function writeTailwindClassInventory(cacheDir: string): Promise<string> {
  await ensureDir(cacheDir);

  const inventoryPath = join(cacheDir, 'tailwind-classes.html');
  const classes = getInventory();

  // Generate HTML with all tracked classes
  // Using hidden div so it's scanned by Tailwind but not rendered
  const html = `<!--
  Auto-generated by Stati - DO NOT EDIT

  This file contains dynamically-generated Tailwind classes extracted from your templates.
  It ensures that Tailwind's JIT compiler generates CSS for classes built with template
  variables (e.g., from-\${color}-50).

  Add this file to your tailwind.config.js content array:
  content: [
    './site/**/*.{md,eta,html}',
    './.stati/tailwind-classes.html'
  ]

  Generated: ${new Date().toISOString()}
  Classes tracked: ${classes.length}
-->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stati Tailwind Class Inventory</title>
</head>
<body>
  <div class="hidden">
    ${
      classes.length > 0
        ? `<div class="${classes.join(' ')}"></div>`
        : '<!-- No dynamic classes tracked yet -->'
    }
  </div>
</body>
</html>
`;

  await writeFile(inventoryPath, html, 'utf-8');

  return inventoryPath;
}

/**
 * Seeds the inventory with common Tailwind patterns.
 * Useful for the initial build when no templates have been rendered yet.
 *
 * @param colors - Array of color names to seed (e.g., ['primary', 'emerald', 'red'])
 * @param shades - Array of color shades to seed (e.g., [50, 100, 500, 900])
 *
 * @example
 * ```typescript
 * seedInventoryWithCommonPatterns(['primary', 'emerald'], [50, 100, 500]);
 * // Generates: from-primary-50, from-primary-100, from-emerald-50, etc.
 * ```
 */
export function seedInventoryWithCommonPatterns(
  colors: string[] = [],
  shades: number[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
): void {
  if (colors.length === 0) {
    return;
  }

  const prefixes = [
    'from',
    'to',
    'bg',
    'text',
    'border',
    'hover:bg',
    'hover:text',
    'hover:border',
    'dark:from',
    'dark:to',
    'dark:bg',
    'dark:text',
    'dark:border',
    'dark:hover:bg',
    'dark:hover:text',
    'group-hover:bg',
    'group-hover:text',
  ];

  for (const color of colors) {
    for (const shade of shades) {
      for (const prefix of prefixes) {
        trackTailwindClass(`${prefix}-${color}-${shade}`);
      }

      // Add opacity variants
      trackTailwindClass(`bg-${color}-${shade}/10`);
      trackTailwindClass(`bg-${color}-${shade}/20`);
      trackTailwindClass(`border-${color}-${shade}/50`);
      trackTailwindClass(`shadow-${color}-${shade}/10`);
    }
  }
}
