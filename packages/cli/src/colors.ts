import chalk from 'chalk';

/**
 * Color utilities for CLI output
 */
export const colors = {
  /**
   * Success messages - green
   */
  success: (text: string) => chalk.green(text),

  /**
   * Error messages - red
   */
  error: (text: string) => chalk.red(text),

  /**
   * Warning messages - yellow
   */
  warning: (text: string) => chalk.yellow(text),

  /**
   * Info messages - blue
   */
  info: (text: string) => chalk.blue(text),

  /**
   * Highlight text - cyan
   */
  highlight: (text: string) => chalk.cyan(text),

  /**
   * Muted text - gray
   */
  muted: (text: string) => chalk.gray(text),

  /**
   * Bold text
   */
  bold: (text: string) => chalk.bold(text),

  /**
   * Numbers and statistics - magenta
   */
  number: (text: string | number) => chalk.magenta(String(text)),
};

/**
 * Formatted log functions for common CLI output patterns
 */
export const log = {
  /**
   * Success message with checkmark
   */
  success: (message: string) => {
    console.log(colors.success('✅ ' + message));
  },

  /**
   * Error message with cross
   */
  error: (message: string) => {
    console.error(colors.error('❌ ' + message));
  },

  /**
   * Warning message with warning sign
   */
  warning: (message: string) => {
    console.warn(colors.warning('⚠️  ' + message));
  },

  /**
   * Info message with info icon
   */
  info: (message: string) => {
    console.log(colors.info('ℹ️  ' + message));
  },

  /**
   * Building progress message
   */
  building: (message: string) => {
    console.log(colors.info('🏗️  ' + message));
  },

  /**
   * File processing message
   */
  processing: (message: string) => {
    console.log(colors.muted('  ' + message));
  },

  /**
   * Statistics or numbers
   */
  stats: (message: string) => {
    console.log(colors.highlight(message));
  },
};
