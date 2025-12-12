#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  build,
  invalidate,
  createDevServer,
  createPreviewServer,
  setEnv,
  writeMetrics,
  formatMetricsSummary,
} from '@stati/core';
import type { BuildOptions, DevServerOptions, PreviewServerOptions } from '@stati/core';
import { log } from './colors.js';
import { createLogger } from './logger.js';
import { watchTailwindCSS } from './tailwind.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
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
  .version(getVersion())
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
        version: getVersion(),
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

        // Show a nice header
        const versionInfo = buildOptions.version ? ` v${buildOptions.version}` : '';
        log.header(`Stati${versionInfo} - Static Site Generator`);

        // Show build options summary
        if (buildOptions.force) log.info('Force rebuild enabled');
        if (buildOptions.clean) log.info('Clean build enabled');
        if (buildOptions.includeDrafts) log.info('Including draft pages');
        if (buildOptions.configPath) log.info(`Using config: ${buildOptions.configPath}`);
        if (metricsEnabled) log.info('Build metrics enabled');

        setEnv('production');
        buildOptions.logger = coloredLogger;
        const startTime = Date.now();

        const result = await build(buildOptions);
        const buildTime = Date.now() - startTime;

        log.timing('Total build', buildTime);
        log.success('Site built successfully!');

        // Handle metrics output
        if (result.buildMetrics) {
          // Print metrics summary to CLI
          const summaryLines = formatMetricsSummary(result.buildMetrics);
          for (const line of summaryLines) {
            console.log(line);
          }

          // Write metrics to file
          const projectRoot = process.cwd();
          const cacheDir = join(projectRoot, '.stati');

          // Validate and sanitize custom metrics output path
          let metricsOutputPath: string | undefined;
          const rawMetricsFile = argv['metrics-file'] as string | undefined;
          if (rawMetricsFile) {
            // Resolve to absolute path relative to project root
            const resolvedPath = isAbsolute(rawMetricsFile)
              ? rawMetricsFile
              : resolve(projectRoot, rawMetricsFile);

            // Security check: validate path before creating any directories
            // Use path.relative() which handles cross-platform path normalization
            // If the relative path starts with '..' it means it escapes the project root
            const relativePath = relative(projectRoot, resolvedPath);
            const escapesRoot = relativePath.startsWith('..') || isAbsolute(relativePath);

            if (escapesRoot) {
              log.error(
                `Invalid metrics-file path: "${rawMetricsFile}" resolves outside the project root. Metrics will not be written to file.`,
              );
            } else {
              metricsOutputPath = resolvedPath;
            }
          }

          const writeResult = await writeMetrics(result.buildMetrics, {
            cacheDir,
            outputPath: metricsOutputPath,
          });

          if (writeResult.success && writeResult.path) {
            log.info(`📈 Metrics written to ${writeResult.path}`);
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
          default: false,
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
        open: !!argv.open,
        ...(argv.config && { configPath: argv.config as string }),
      };

      try {
        // Enhanced logger via factory (centralized)
        const coloredLogger = createLogger();

        devOptions.logger = coloredLogger;

        // Show a nice header
        const versionInfo = getVersion() ? ` v${getVersion()}` : '';
        log.header(`Stati${versionInfo} - Development Server`);

        // Show dev server options
        log.info(`Server will run at http://${argv.host}:${argv.port}`);
        if (argv.open) log.info('Browser will open automatically');
        if (argv.config) log.info(`Using config: ${argv.config}`);

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
          default: false,
        })
        .option('config', {
          type: 'string',
          description: 'Path to config file',
        }),
    async (argv) => {
      const previewOptions: PreviewServerOptions = {
        port: argv.port as number,
        host: argv.host as string,
        open: !!argv.open,
        ...(argv.config && { configPath: argv.config as string }),
      };

      try {
        // Enhanced logger via factory (centralized)
        const coloredLogger = createLogger();

        previewOptions.logger = coloredLogger;

        // Show a nice header
        const versionInfo = getVersion() ? ` v${getVersion()}` : '';
        log.header(`Stati${versionInfo} - Preview Server`);

        // Show preview server options
        log.info(`Server will run at http://${argv.host}:${argv.port}`);
        if (argv.open) log.info('Browser will open automatically');
        if (argv.config) log.info(`Using config: ${argv.config}`);

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
        log.header('Stati Cache Invalidation');

        if (argv.query) {
          log.info(`🎯 Invalidating cache for: ${argv.query}`);
        } else {
          log.info('🗑️  Clearing entire cache');
        }

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
            log.info(`   📄 ${path}`);
          });
        } else {
          log.info('ℹ️  No cache entries matched the query');
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
