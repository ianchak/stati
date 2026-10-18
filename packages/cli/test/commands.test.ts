import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@stati/core', () => ({
  build: vi.fn(),
  createDevServer: vi.fn(),
  createPreviewServer: vi.fn(),
  invalidate: vi.fn(),
  setEnv: vi.fn(),
  writeMetrics: vi.fn(),
}));

/**
 * Runs the CLI program with the given arguments, as `stati <args>` would.
 *
 * @returns The exit code it asked for, if any, and what it printed as errors
 */
async function runCli(args: string[]): Promise<{ exitCode: number | undefined; errors: string }> {
  const argv = process.argv;
  let exitCode: number | undefined;
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCode = code;
    throw new Error(`process.exit(${code})`);
  }) as never);
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.resetModules();
  process.argv = [process.execPath, 'stati', ...args];
  try {
    await import('../src/cli.js');
  } catch {
    // process.exit, mocked to throw
  } finally {
    process.argv = argv;
  }
  return { exitCode, errors: error.mock.calls.flat().join('\n') };
}

describe('stati commands', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails on a mistyped command and suggests the one it was probably meant to be', async () => {
    const { exitCode, errors } = await runCli(['biuld']);

    expect(exitCode).toBe(1);
    expect(errors).toContain('Did you mean build?');
  });

  it('fails without a command', async () => {
    const { exitCode, errors } = await runCli([]);

    expect(exitCode).toBe(1);
    expect(errors).toContain('Not enough non-option arguments');
  });
});
