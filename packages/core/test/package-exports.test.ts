import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const coreDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(join(coreDir, 'package.json'), 'utf8')) as {
  exports: Record<string, { types: string; default: string }>;
};

describe('built package exports', () => {
  let fixtureDir: string;
  let packageDir: string;

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'stati-package-exports-'));
    packageDir = join(fixtureDir, 'node_modules', '@stati', 'core');
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(packageDir, 'package.json'),
      readFileSync(join(coreDir, 'package.json'), 'utf8'),
    );
    writeFileSync(join(fixtureDir, 'package.json'), JSON.stringify({ type: 'module' }));

    const configPath = join(coreDir, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    }
    const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, coreDir, {
      outDir: join(packageDir, 'dist'),
      declarationMap: false,
    });
    expect(config.errors).toEqual([]);
    const program = ts.createProgram(config.fileNames, config.options);
    const emit = program.emit();
    const diagnostics = [...ts.getPreEmitDiagnostics(program), ...emit.diagnostics];
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([]);
    expect(emit.emitSkipped).toBe(false);
  }, 30000);

  afterAll(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('maps every public export to emitted declarations and JavaScript', () => {
    for (const conditions of Object.values(packageJson.exports)) {
      for (const target of Object.values(conditions)) {
        expect(existsSync(join(packageDir, target)), target).toBe(true);
      }
    }
  });

  it.each([
    ['Bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
    ['NodeNext', ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
  ] as const)(
    'type-checks consumer configuration with %s resolution',
    (_, module, moduleResolution) => {
      const configPath = join(fixtureDir, 'stati.config.ts');
      writeFileSync(
        configPath,
        `
import { defineConfig } from '@stati/core';
import type { SiteConfig } from '@stati/core';
import type { SiteConfig as SubpathSiteConfig } from '@stati/core/types';
import { loadConfig, clearConfigCache } from '@stati/core/config';

const site: SiteConfig = { title: 'Test Site', baseUrl: 'https://example.com' };
const subpathSite: SubpathSiteConfig = site;
export default defineConfig({ site: subpathSite });
export { loadConfig, clearConfigCache };
`,
      );

      const program = ts.createProgram([configPath], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ES2022,
        module,
        moduleResolution,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(
        diagnostics.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        ),
      ).toEqual([]);
    },
  );
});
