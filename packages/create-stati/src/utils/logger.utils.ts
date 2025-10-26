/**
 * Professional color palette for Stati CLI - matching the main CLI colors
 */
const colors = {
  brand: (text: string) => `\x1b[38;2;79;70;229m${text}\x1b[0m`, // #4f46e5 - Professional indigo
  success: (text: string) => `\x1b[38;2;22;163;74m${text}\x1b[0m`, // #16a34a - Muted forest green
  error: (text: string) => `\x1b[38;2;220;38;38m${text}\x1b[0m`, // #dc2626 - Muted red
  warning: (text: string) => `\x1b[38;2;217;119;6m${text}\x1b[0m`, // #d97706 - Muted amber
  info: (text: string) => `\x1b[38;2;37;99;235m${text}\x1b[0m`, // #2563eb - Muted steel blue
  muted: (text: string) => `\x1b[38;2;107;114;128m${text}\x1b[0m`, // #6b7280 - Warm gray
  highlight: (text: string) => `\x1b[38;2;8;145;178m${text}\x1b[0m`, // #0891b2 - Muted teal
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`, // Bold styling
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
  info: colors.info,
  muted: colors.muted,
  highlight: colors.highlight,
  bold: colors.bold,

  // Logging methods
  log: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  logError: (message: string) => console.error(message),
};
