/**
 * Parses common truthy environment flag values.
 */
export function isEnabledEnvFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
