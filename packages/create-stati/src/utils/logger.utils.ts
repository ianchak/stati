import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ice Blue Mono-Hue Palette - Single source of truth for CLI colors
 * Matches the palette in @stati/cli for consistency
 *
 * NOTE: This palette is intentionally duplicated from @stati/cli to keep
 * create-stati as a standalone package without runtime dependencies on the CLI.
 * When updating colors, ensure both files stay in sync.
 */
const palette = {
  // Brand hue family (Ice Blue)
  brandStrong: '#bae6fd', // sky-200 - numbers, emphasis, stats
  brand: '#38bdf8', // sky-400 - headers, step indicators, folders
  brandDim: '#0ea5e9', // sky-500 - gradient start, subtle brand

  // Neutral ramp
  muted: '#94a3b8', // slate-400 - labels, file paths
  dim: '#64748b', // slate-500 - timing, metadata

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
  arrow: '▸',
} as const;

/**
 * ASCII art banner for Stati
 */
const STATI_ASCII_ART = [
  '███████╗████████╗ █████╗ ████████╗██╗',
  '██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██║',
  '███████╗   ██║   ███████║   ██║   ██║',
  '╚════██║   ██║   ██╔══██║   ██║   ██║',
  '███████║   ██║   ██║  ██║   ██║   ██║',
  '╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚═╝',
];

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
 * Parse hex color to RGB tuple
 */
function parseHex(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * Interpolate between two hex colors
 */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = parseHex(colorA);
  const [r2, g2, b2] = parseHex(colorB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Apply horizontal gradient to a line of text
 */
function applyHorizontalGradient(line: string): string {
  if (!isColorEnabled()) return line;

  const chars = [...line];
  const width = chars.length;
  if (width === 0) return line;

  return (
    chars
      .map((char, i) => {
        // Skip coloring whitespace
        if (char.trim() === '') return char;

        const t = i / width;
        let color: string;

        if (t < 0.33) {
          // Interpolate brandDim → brand
          const localT = t / 0.33;
          color = lerpColor(palette.brandDim, palette.brand, localT);
        } else if (t < 0.66) {
          // Hold at brand
          color = palette.brand;
        } else {
          // Interpolate brand → brandStrong
          const localT = (t - 0.66) / 0.34;
          color = lerpColor(palette.brand, palette.brandStrong, localT);
        }

        return `${hexToAnsi(color)}${char}`;
      })
      .join('') + '\x1b[0m'
  );
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
 * Get the create-stati package version
 */
function getVersion(): string {
  try {
    // Navigate from utils/ up to package.json (../../package.json in dist)
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Creates a decorative startup banner with ASCII art and horizontal gradient
 */
function createStartupBanner(): string {
  const version = getVersion();
  const lines: string[] = [''];

  // Apply gradient to each ASCII art line
  for (const artLine of STATI_ASCII_ART) {
    lines.push(applyHorizontalGradient(artLine));
  }

  lines.push('');

  // Version line
  const versionLine = `${colors.muted('create-stati')} ${colors.brand(`v${version}`)}`;
  lines.push(versionLine);

  lines.push('');

  return lines.join('\n');
}

/**
 * Formatted log functions for common CLI output patterns
 * Matches the pattern in @stati/cli for consistency
 */
export const log = {
  /**
   * Success message with checkmark glyph
   */
  success: (message: string) => {
    console.log(colors.success(glyphs.success) + ' ' + message);
  },

  /**
   * Error message with cross glyph
   */
  error: (message: string) => {
    console.error(colors.error(glyphs.error) + ' ' + message);
  },

  /**
   * Warning message with warning glyph
   */
  warning: (message: string) => {
    console.warn(colors.warning(glyphs.warning) + ' ' + message);
  },

  /**
   * Info/brand message
   */
  info: (message: string) => {
    console.log(colors.brand(message));
  },

  /**
   * Muted/secondary message
   */
  muted: (message: string) => {
    console.log(colors.muted(message));
  },

  /**
   * Step instruction (indented with arrow)
   */
  step: (message: string) => {
    console.log(colors.brand(`  ${message}`));
  },

  /**
   * Hint/tip message (muted with arrow)
   */
  hint: (message: string) => {
    console.log(colors.muted(`${glyphs.arrow} ${message}`));
  },

  /**
   * Status/meta message with status glyph (▸)
   * Used for build status updates, cache operations, and informational markers
   */
  status: (message: string) => {
    console.log(colors.brand(glyphs.arrow) + ' ' + message);
  },

  /**
   * Blank line
   */
  newline: () => {
    console.log();
  },

  /**
   * Display decorative startup banner
   */
  startupBanner: () => {
    console.log(createStartupBanner());
  },

  /**
   * Format text as bold
   */
  bold: colors.bold,

  /**
   * Format text with brand color
   */
  brand: colors.brand,
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

  /**
   * Display decorative startup banner
   */
  startupBanner: () => {
    console.log(createStartupBanner());
  },
};
