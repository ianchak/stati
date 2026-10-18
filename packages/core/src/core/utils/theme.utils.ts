/**
 * Look of the pages Stati shows about its own work: the development error overlay and the
 * build metrics report. Both follow the design of the Stati documentation site: slate neutrals,
 * one blue accent and hairline rules, in a light and a dark theme.
 */

/** The Stati mark, a lightning bolt, as an SVG path on a 24 by 24 grid */
export const STATI_MARK_PATH = 'M13 10V3L4 14h7v7l9-11h-7z';

/** Inline favicon, so these pages never request the site's own favicon. */
export const STATI_FAVICON_HREF = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${STATI_MARK_PATH}"/></svg>`,
)}`;

const LIGHT_COLORS = `
      --canvas: 255 255 255;
      --raised: 248 250 252;
      --sunken: 246 248 250;
      --ink: 11 13 18;
      --muted: 71 85 105;
      --faint: 91 101 119;
      --line: 226 232 240;
      --line-strong: 203 213 225;
      --accent: 37 99 235;
      --accent-ink: 29 78 216;
      --on-accent: 255 255 255;
      --danger: 185 28 28;
      --danger-wash: 254 242 242;
      color-scheme: light;`;

/**
 * Color tokens as RGB channels, for `rgb(var(--ink))` and `rgb(var(--ink) / 0.4)`, in the light
 * theme and, when the system asks for it, the dark theme; and the three font stacks.
 */
export const STATI_THEME_STYLES = `
    :root {${LIGHT_COLORS}
      --font-display: 'Archivo', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'Fira Code', ui-monospace, 'Cascadia Code', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --canvas: 2 6 23;
        --raised: 15 23 42;
        --sunken: 11 18 32;
        --ink: 241 245 249;
        --muted: 148 163 184;
        --faint: 131 145 167;
        --line: 30 41 59;
        --line-strong: 51 65 85;
        --accent: 96 165 250;
        --accent-ink: 147 197 253;
        --on-accent: 2 6 23;
        --danger: 248 113 113;
        --danger-wash: 38 12 20;
        color-scheme: dark;
      }
    }`;

/** The light theme on paper, so a page viewed in the dark theme does not print light on white. */
export const STATI_PRINT_STYLES = `
    @media print {
      :root {${LIGHT_COLORS}
      }
    }`;
