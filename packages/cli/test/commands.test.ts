import { afterEach, describe, expect, it, vi } from 'vitest';

// Shared across module resets, so a test can set what the CLI receives
const mocks = vi.hoisted(() => ({
  build: vi.fn(),
  createDevServer: vi.fn(),
  watchTailwindCSS: vi.fn(),
  stopTailwindWatcher: vi.fn(),
}));

vi.mock('@stati/core', () => ({
  build: mocks.build,
  createDevServer: mocks.createDevServer,
  createPreviewServer: vi.fn(),
  invalidate: vi.fn(),
  setEnv: vi.fn(),
  writeMetrics: vi.fn(),
  getStatiVersion: vi.fn(() => '2.0.0'),
}));

vi.mock('../src/tailwind.js', () => ({
  watchTailwindCSS: mocks.watchTailwindCSS,
  stopTailwindWatcher: mocks.stopTailwindWatcher,
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

  it('passes the Tailwind files to the build, which runs Tailwind after the pages render', async () => {
    mocks.build.mockResolvedValue({});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const { exitCode } = await runCli([
      'build',
      '--tailwind-input',
      'src/styles.css',
      '--tailwind-output',
      'dist/styles.css',
    ]);

    expect(exitCode).toBeUndefined();
    expect(mocks.build).toHaveBeenCalledWith(
      expect.objectContaining({
        tailwind: { input: 'src/styles.css', output: 'dist/styles.css' },
      }),
    );
  });

  it('builds without Tailwind when neither file is given', async () => {
    mocks.build.mockResolvedValue({});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCli(['build']);

    expect(mocks.build.mock.calls[0]?.[0]).not.toHaveProperty('tailwind');
  });

  it('builds with the config in the current directory, ignoring --config', async () => {
    mocks.build.mockResolvedValue({});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCli(['build', '--config', 'other/stati.config.js']);

    expect(mocks.build.mock.calls[0]?.[0]).not.toHaveProperty('configPath');
  });

  it('fails a build given only one of the Tailwind files', async () => {
    const { exitCode, errors } = await runCli(['build', '--tailwind-input', 'src/styles.css']);

    expect(exitCode).toBe(1);
    // The heading is yargs' translation, "Missing dependent arguments:" in English and the
    // untranslated "Implications failed:" where the locale has none, such as CI's
    expect(errors).toContain('tailwind-input -> tailwind-output');
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it('stops the Tailwind watcher, then the dev server, on Ctrl+C', async () => {
    const devServer = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      url: 'http://localhost:3000',
    };
    const watcher = { pid: 1234 };
    mocks.createDevServer.mockResolvedValue(devServer);
    mocks.watchTailwindCSS.mockReturnValue(watcher);
    mocks.stopTailwindWatcher.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // The dev command replaces the process's signal handlers
    const signals = ['SIGINT', 'SIGTERM'] as const;
    const listeners = signals.map((signal) => process.listeners(signal));
    try {
      await runCli([
        'dev',
        '--tailwind-input',
        'src/styles.css',
        '--tailwind-output',
        'dist/styles.css',
      ]);
      await vi.waitFor(() => expect(mocks.watchTailwindCSS).toHaveBeenCalled());
      // Pages link the watcher's output
      expect(mocks.createDevServer).toHaveBeenCalledWith(
        expect.objectContaining({
          tailwind: { input: 'src/styles.css', output: 'dist/styles.css' },
        }),
      );
      const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      process.emit('SIGINT', 'SIGINT');

      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
      expect(mocks.stopTailwindWatcher).toHaveBeenCalledWith(watcher, expect.any(Object));
      expect(mocks.stopTailwindWatcher.mock.invocationCallOrder[0]).toBeLessThan(
        devServer.stop.mock.invocationCallOrder[0]!,
      );
    } finally {
      signals.forEach((signal, i) => {
        process.removeAllListeners(signal);
        listeners[i]!.forEach((listener) => process.on(signal, listener));
      });
    }
  });
});
