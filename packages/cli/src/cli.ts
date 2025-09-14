#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build, invalidate, createDevServer } from '@stati/core';
import type { BuildOptions, DevServerOptions } from '@stati/core';
import { log } from './colors.js';

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
        }),
    async (argv) => {
      const buildOptions: BuildOptions = {
        force: !!argv.force,
        clean: !!argv.clean,
        includeDrafts: !!argv['include-drafts'],
        version: getVersion(),
      };

      if (argv.config) {
        buildOptions.configPath = argv.config as string;
      }

      try {
        // Enhanced logger with new prettier functions
        const coloredLogger = {
          info: log.info,
          success: log.success,
          warning: log.warning,
          error: log.error,
          building: log.building,
          processing: log.processing,
          stats: log.stats,
          // Add new prettier logging methods
          header: log.header,
          step: log.step,
          progress: log.progress,
          file: log.file,
          url: log.url,
          timing: log.timing,
          statsTable: log.statsTable,
          navigationTree: log.navigationTree,
          // Add rendering tree methods
          startRenderingTree: log.startRenderingTree,
          addTreeNode: log.addTreeNode,
          updateTreeNode: log.updateTreeNode,
          showRenderingTree: log.showRenderingTree,
          clearRenderingTree: log.clearRenderingTree,
        };

        // Show a nice header
        const versionInfo = buildOptions.version ? ` v${buildOptions.version}` : '';
        log.header(`Stati${versionInfo} - Static Site Generator`);

        // Show build options summary
        if (buildOptions.force) log.info('Force rebuild enabled');
        if (buildOptions.clean) log.info('Clean build enabled');
        if (buildOptions.includeDrafts) log.info('Including draft pages');
        if (buildOptions.configPath) log.info(`Using config: ${buildOptions.configPath}`);

        buildOptions.logger = coloredLogger;
        const startTime = Date.now();

        await build(buildOptions);
        const buildTime = Date.now() - startTime;

        console.log(); // Add spacing before final messages
        log.timing('Total build', buildTime);
        log.success('Site built successfully!');
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
        }),
    async (argv) => {
      const devOptions: DevServerOptions = {
        port: argv.port as number,
        host: argv.host as string,
        open: !!argv.open,
        ...(argv.config && { configPath: argv.config as string }),
      };

      try {
        // Enhanced logger with new prettier functions
        const coloredLogger = {
          info: log.info,
          success: log.success,
          warning: log.warning,
          error: log.error,
          building: log.building,
          processing: log.processing,
          stats: log.stats,
          // Add new prettier logging methods
          header: log.header,
          step: log.step,
          progress: log.progress,
          file: log.file,
          url: log.url,
          timing: log.timing,
          statsTable: log.statsTable,
          navigationTree: log.navigationTree,
          // Add rendering tree methods
          startRenderingTree: log.startRenderingTree,
          addTreeNode: log.addTreeNode,
          updateTreeNode: log.updateTreeNode,
          showRenderingTree: log.showRenderingTree,
          clearRenderingTree: log.clearRenderingTree,
        };

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

        // Handle graceful shutdown
        const shutdown = async () => {
          log.info('\n🛑 Shutting down dev server...');
          await devServer.stop();
          process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      } catch (error) {
        log.error(`Dev server failed: ${error instanceof Error ? error.message : String(error)}`);
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
