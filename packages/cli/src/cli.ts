#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  build,
  invalidate,
  createDevServer,
  createPreviewServer,
  setEnv,
  writeMetrics,
  getStatiVersion,
} from '@stati/core';
import type { BuildOptions, DevServerOptions, PreviewServerOptions } from '@stati/core';
import { log } from './colors.js';
import { createLogger } from './logger.js';
import { watchTailwindCSS } from './tailwind.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getCliVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

const cli = yargs(hideBin(process.argv))
  .scriptName('stati')
  .version(getCliVersion())
  .command(
    'build',
    'Build site',
    (y) =>
      y
        .option('force', {
          type: 'boolean',
          description: 'Force full rebuild without deleting cache',
        })
        .option('clean', {
          type: 'boolean',
          description: 'Clean cache before building',
        })
        .option('config', {
          type: 'string',
          description: 'Path to config file',
        })
        .option('include-drafts', {
          type: 'boolean',
          description: 'Include draft pages in the build',
        })
        .option('metrics', {
          type: 'boolean',
          description: 'Enable build metrics collection',
        })
        .option('metrics-file', {
          type: 'string',
          description: 'Output path for metrics JSON (default: .stati/metrics/)',
        })
        .option('metrics-detailed', {
          type: 'boolean',
          description: 'Include per-page timing in metrics',
        }),
    async (argv) => {
      // Check for metrics enabled via environment or flag
      const metricsEnabled =
        !!argv.metrics || process.env.STATI_METRICS === '1' || process.env.STATI_METRICS === 'true';

      const buildOptions: BuildOptions = {
        force: !!argv.force,
        clean: !!argv.clean,
        includeDrafts: !!argv['include-drafts'],
        cliVersion: getCliVersion(),
        coreVersion: getStatiVersion(),
        metrics: metricsEnabled
          ? {
              enabled: true,
              detailed: !!argv['metrics-detailed'],
            }
          : undefined,
      };

      if (argv.config) {
        buildOptions.configPath = argv.config as string;
      }

      try {
        // Enhanced logger via factory (centralized)
        const coloredLogger = createLogger();

        // Show decorative startup banner
        log.startupBanner('Build', getCliVersion(), getStatiVersion());

        // Show command info box with all options
        log.commandInfo('build', [
          { name: 'Force', value: !!buildOptions.force, isDefault: !buildOptions.force },
          { name: 'Clean', value: !!buildOptions.clean, isDefault: !buildOptions.clean },
          {
            name: 'Drafts',
            value: !!buildOptions.includeDrafts,
            isDefault: !buildOptions.includeDrafts,
          },
          {
            name: 'Config',
            value: buildOptions.configPath || '',
            isDefault: !buildOptions.configPath,
          },
          { name: 'Metrics', value: metricsEnabled, isDefault: !metricsEnabled },
        ]);

        setEnv('production');
        buildOptions.logger = coloredLogger;

        const result = await build(buildOptions);

        log.success('Site built successfully!');

        // Handle metrics output
        if (result.buildMetrics) {
          // Write metrics to file
          const projectRoot = process.cwd();
          const cacheDir = join(projectRoot, '.stati');

          const metricsSafeDir = join(cacheDir, 'metrics');

          // Validate and sanitize custom metrics output path
          let metricsOutputPath: string | undefined;
          const rawMetricsFile = argv['metrics-file'] as string | undefined;
          if (rawMetricsFile) {
            // Only allow writing metrics files within .stati/metrics/
            const resolvedPath = isAbsolute(rawMetricsFile)
              ? resolve(rawMetricsFile)
              : resolve(metricsSafeDir, rawMetricsFile);

            // Security check: ensure resolvedPath is within metricsSafeDir
            const normalizedSafeDir = resolve(metricsSafeDir) + sep;
            const normalizedTarget = resolve(resolvedPath);

            if (!normalizedTarget.startsWith(normalizedSafeDir)) {
              log.error(
                `Invalid metrics-file path: "${rawMetricsFile}" must be within ".stati/metrics/". Metrics will not be written to file.`,
              );
            } else {
              metricsOutputPath = normalizedTarget;
            }
          }

          const writeResult = await writeMetrics(result.buildMetrics, {
            cacheDir,
            outputPath: metricsOutputPath,
          });

          if (writeResult.success && writeResult.path) {
            log.status(`Metrics written to ${writeResult.path}`);
          } else if (!writeResult.success) {
            const targetPath = metricsOutputPath || `${cacheDir}/metrics/`;
            log.error(
              writeResult.error || `Failed to write metrics to ${targetPath} (unknown error)`,
            );
          }
        }
      } catch (error) {
        log.error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  )
  .command(
    'dev',
    'Start development server',
    (y) =>
      y
        .option('port', {
          type: 'number',
          description: 'Port to run the dev server on',
          default: 3000,
        })
        .option('host', {
          type: 'string',
          description: 'Host to bind the dev server to',
          default: 'localhost',
        })
        .option('open', {
          type: 'boolean',
          description: 'Open browser after starting server',
        })
        .option('config', {
          type: 'string',
          description: 'Path to config file',
        })
        .option('tailwind-input', {
          type: 'string',
          description: 'Input file for Tailwind CSS watcher.',
        })
        .option('tailwind-output', {
          type: 'string',
          description: 'Output file for Tailwind CSS watcher.',
        })
        .option('tailwind-verbose', {
          type: 'boolean',
          description: 'Show all Tailwind CSS output in dev mode.',
          default: false,
        }),
    async (argv) => {
      const devOptions: DevServerOptions = {
        port: argv.port as number,
        host: argv.host as string,
        ...(argv.open !== undefined && { open: argv.open }),
        ...(argv.config && { configPath: argv.config as string }),
      };

      try {
        // Enhanced logger via factory (centralized)
        const coloredLogger = createLogger();

        devOptions.logger = coloredLogger;

        // Show decorative startup banner
        log.startupBanner('Development Server', getCliVersion(), getStatiVersion());

        // Show command info box with all options
        log.commandInfo('dev', [
          { name: 'Host', value: argv.host as string, isDefault: argv.host === 'localhost' },
          { name: 'Port', value: argv.port as number, isDefault: argv.port === 3000 },
          { name: 'Open', value: !!argv.open, isDefault: !argv.open },
          { name: 'Config', value: (argv.config as string) || '', isDefault: !argv.config },
          {
            name: 'Tailwind',
            value: !!(argv['tailwind-input'] && argv['tailwind-output']),
            isDefault: !(argv['tailwind-input'] && argv['tailwind-output']),
          },
        ]);

        const devServer = await createDevServer(devOptions);
        await devServer.start();

        // Start Tailwind watcher if configured (after dev server is running)
        let tailwindWatcher: ReturnType<typeof watchTailwindCSS> | null = null;
        if (argv['tailwind-input'] && argv['tailwind-output']) {
          tailwindWatcher = watchTailwindCSS(
            {
              input: argv['tailwind-input'],
              output: argv['tailwind-output'],
              verbose: !!argv['tailwind-verbose'],
            },
            coloredLogger,
          );
        }

        // Handle graceful shutdown
        let shutdownInProgress = false;
        const shutdown = async () => {
          // Immediate guard before any async operations
          if (shutdownInProgress) {
            return;
          }
          shutdownInProgress = true;

          log.info('\nShutting down dev server...');

          // Stop Tailwind watcher and wait for it to fully exit
          if (tailwindWatcher && !tailwindWatcher.killed) {
            await new Promise<void>((resolve) => {
              // Set a timeout in case the process doesn't exit cleanly
              const timeout = global.setTimeout(() => {
                log.warning('Tailwind watcher did not exit cleanly, forcing shutdown');
                tailwindWatcher?.kill('SIGKILL');
                resolve();
              }, 3000);

              tailwindWatcher.once('close', () => {
                global.clearTimeout(timeout);
                resolve();
              });

              tailwindWatcher.kill('SIGTERM');
            });
          }

          await devServer.stop();
          process.exit(0);
        };

        // Remove any existing listeners to prevent duplicates
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');

        // Use once() instead of on() to ensure handler only fires once per signal
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
      } catch (error) {
        log.error(`Dev server failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  )
  .command(
    'preview',
    'Start preview server for built site',
    (y) =>
      y
        .option('port', {
          type: 'number',
          description: 'Port to run the preview server on',
          default: 4000,
        })
        .option('host', {
          type: 'string',
          description: 'Host to bind the preview server to',
          default: 'localhost',
        })
        .option('open', {
          type: 'boolean',
          description: 'Open browser after starting server',
        })
        .option('config', {
          type: 'string',
          description: 'Path to config file',
        }),
    async (argv) => {
      const previewOptions: PreviewServerOptions = {
        port: argv.port as number,
        host: argv.host as string,
        ...(argv.open !== undefined && { open: argv.open }),
        ...(argv.config && { configPath: argv.config as string }),
      };

      try {
        // Enhanced logger via factory (centralized)
        const coloredLogger = createLogger();

        previewOptions.logger = coloredLogger;

        // Show decorative startup banner
        log.startupBanner('Preview Server', getCliVersion(), getStatiVersion());

        // Show command info box with all options
        log.commandInfo('preview', [
          { name: 'Host', value: argv.host as string, isDefault: argv.host === 'localhost' },
          { name: 'Port', value: argv.port as number, isDefault: argv.port === 4000 },
          { name: 'Open', value: !!argv.open, isDefault: !argv.open },
          { name: 'Config', value: (argv.config as string) || '', isDefault: !argv.config },
        ]);

        const previewServer = await createPreviewServer(previewOptions);
        await previewServer.start();

        // Handle graceful shutdown
        const shutdown = async () => {
          log.info('\nShutting down preview server...');
          await previewServer.stop();
          process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      } catch (error) {
        log.error(
          `Preview server failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  )
  .command(
    'invalidate [query]',
    'Invalidate cache entries by tag, path, pattern, or age',
    (y) =>
      y.positional('query', {
        type: 'string',
        description:
          'Invalidation query: tag:value, path:value, glob:pattern, age:3months, or empty to clear all',
      }),
    async (argv) => {
      try {
        // Show decorative startup banner
        log.startupBanner('Invalidate', getCliVersion(), getStatiVersion());

        // Show command info box with query details
        log.commandInfo('invalidate', [
          {
            name: 'Query',
            value: (argv.query as string) || 'clear all',
            isDefault: !argv.query,
          },
        ]);

        const result: {
          invalidatedCount: number;
          invalidatedPaths: string[];
          clearedAll: boolean;
        } = await invalidate(argv.query as string | undefined);

        if (result.clearedAll) {
          log.success(`Cleared entire cache (${result.invalidatedCount} entries)`);
        } else if (result.invalidatedCount > 0) {
          log.success(`Invalidated ${result.invalidatedCount} cache entries:`);
          result.invalidatedPaths.forEach((path) => {
            log.info(`   ${path}`);
          });
        } else {
          log.status('No cache entries matched the query');
        }
      } catch (error) {
        log.error(`Invalidation failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    },
  )
  .demandCommand(1)
  .help();

cli.parse();
