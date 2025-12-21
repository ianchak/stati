/**
 * Ice Blue Mono-Hue Palette — Single source of truth for CLI colors
 * Matches the palette in @stati/cli for consistency
 *
 * NOTE: This palette is intentionally duplicated from @stati/cli to keep
 * create-stati as a standalone package without runtime dependencies on the CLI.
 * When updating colors, ensure both files stay in sync.
 */
const palette = {
  // Brand hue family (Ice Blue)
  brandStrong: '#bae6fd', // sky-200 — numbers, emphasis, stats
  brand: '#38bdf8', // sky-400 — headers, step indicators, folders
  brandDim: '#0ea5e9', // sky-500 — gradient start, subtle brand

  // Neutral ramp
  muted: '#94a3b8', // slate-400 — labels, file paths
  dim: '#64748b', // slate-500 — timing, metadata

  // Status glyph colors (glyph/prefix only, not full message)
  successGlyph: '#22c55e', // green-500
  warningGlyph: '#f59e0b', // amber-500
  errorGlyph: '#ef4444', // red-500
} as const;

/**
 * Unicode glyphs for terminal-safe output
 */
const glyphs = {
  success: '✓',
  error: '×',
  warning: '!',
  bullet: '•',
} as const;

/**
 * Check if color output is enabled
 */
function isColorEnabled(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  if (!process.stdout.isTTY) return false;
  return true;
}

/**
 * Convert hex color to ANSI RGB escape code
 */
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Create a color function that respects NO_COLOR
 */
function createColorFn(ansiCode: string): (text: string) => string {
  return (text: string) => (isColorEnabled() ? `${ansiCode}${text}\x1b[0m` : text);
}

/**
 * Professional color palette for create-stati CLI (Ice Blue mono-hue)
 */
const colors = {
  brand: createColorFn(hexToAnsi(palette.brand)),
  brandStrong: createColorFn(hexToAnsi(palette.brandStrong)),
  success: createColorFn(hexToAnsi(palette.successGlyph)),
  error: createColorFn(hexToAnsi(palette.errorGlyph)),
  warning: createColorFn(hexToAnsi(palette.warningGlyph)),
  muted: createColorFn(hexToAnsi(palette.muted)),
  bold: (text: string) => (isColorEnabled() ? `\x1b[1m${text}\x1b[0m` : text),
};

/**
 * Shared logger for create-stati with consistent colored output
 */
export const logger = {
  // Color helpers (for direct use)
  brand: colors.brand,
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  muted: colors.muted,
  bold: colors.bold,

  // Glyph access
  glyphs,

  // Logging methods
  log: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  logError: (message: string) => console.error(message),
};
