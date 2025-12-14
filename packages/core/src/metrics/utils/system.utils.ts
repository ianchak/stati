/**
 * System information utilities for metrics collection.
 * Uses only Node.js built-ins to avoid external dependencies.
 */

import { execSync } from 'node:child_process';
import { cpus, platform, arch } from 'node:os';

/**
 * CI environment detection environment variables.
 */
const CI_ENV_VARS = [
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'CIRCLECI',
  'TRAVIS',
  'JENKINS_URL',
  'BUILDKITE',
  'AZURE_PIPELINES',
  'TF_BUILD',
] as const;

/**
 * Detect if running in a CI environment.
 */
export function isCI(): boolean {
  return CI_ENV_VARS.some((envVar) => process.env[envVar] !== undefined);
}

/**
 * Get the current Git commit SHA.
 * Returns undefined if not in a git repository or git is not available.
 */
export function getGitCommit(): string | undefined {
  try {
    const result = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get the current Git branch name.
 * Returns undefined if not in a git repository or git is not available.
 */
export function getGitBranch(): string | undefined {
  try {
    const result = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get the number of CPU cores.
 */
export function getCpuCount(): number {
  return cpus().length;
}

/**
 * Get the current platform.
 */
export function getPlatform(): ReturnType<typeof platform> {
  return platform();
}

/**
 * Get the CPU architecture.
 */
export function getArch(): string {
  return arch();
}

/**
 * Get Node.js version string (without the 'v' prefix).
 */
export function getNodeVersion(): string {
  return process.version.replace(/^v/, '');
}

/**
 * Get current memory usage snapshot.
 */
export function getMemoryUsage(): {
  rss: number;
  heapUsed: number;
  heapTotal: number;
} {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
  };
}
