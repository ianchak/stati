import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, '..', '..', '..', '..');

const homeTemplate = readFileSync(join(repoRoot, 'docs-site', 'site', 'home.eta'), 'utf-8');
const buildPathTemplate = readFileSync(
  join(repoRoot, 'docs-site', 'site', '_home', 'buildPath.eta'),
  'utf-8',
);
const featuresTemplate = readFileSync(
  join(repoRoot, 'docs-site', 'site', '_home', 'features.eta'),
  'utf-8',
);
const indexPage = readFileSync(join(repoRoot, 'docs-site', 'site', 'index.md'), 'utf-8');
const styles = readFileSync(join(repoRoot, 'docs-site', 'src', 'styles.css'), 'utf-8');

describe('TASK_006 homepage composition', () => {
  it('registers buildPath between hero and features in home layout', () => {
    const heroIndex = homeTemplate.indexOf('<%~ stati.partials.hero %>');
    const buildPathIndex = homeTemplate.indexOf('<%~ stati.partials.buildPath %>');
    const featuresIndex = homeTemplate.indexOf('<%~ stati.partials.features %>');

    expect(heroIndex).toBeGreaterThan(-1);
    expect(buildPathIndex).toBeGreaterThan(heroIndex);
    expect(featuresIndex).toBeGreaterThan(buildPathIndex);
  });

  it('uses the exact pipeline vocabulary from site markdown to cache', () => {
    expect(buildPathTemplate).toContain("token: 'site/*.md'");
    expect(buildPathTemplate).toContain("token: 'markdown-it'");
    expect(buildPathTemplate).toContain("token: '.eta'");
    expect(buildPathTemplate).toContain("token: 'dist/*.html'");
    expect(buildPathTemplate).toContain("token: '.stati/cache'");
  });

  it('defines exactly six capability modules with larger TypeScript and ISG modules', () => {
    const moduleCount = (indexPage.match(/^ {4}- title:/gm) || []).length;
    const largeSpanCount = (indexPage.match(/^ {6}span: 'large'$/gm) || []).length;
    const artifactCount = (indexPage.match(/^ {6}artifact:$/gm) || []).length;

    expect(moduleCount).toBe(6);
    expect(largeSpanCount).toBe(2);
    expect(artifactCount).toBeGreaterThanOrEqual(3);
    expect(indexPage).toContain("    - title: 'TypeScript-first bundle routing'");
    expect(indexPage).toContain("    - title: 'ISG cache manifest'");
    expect(featuresTemplate).toContain('docs-capabilities__grid');
    expect(featuresTemplate).toContain('docs-capability--large');
  });

  it('defines strict single-column layouts for build path and capabilities below 768px', () => {
    const mobileMediaBlock =
      /@media \(max-width: 767px\)\s*\{[\s\S]*?\n {2}\}/m.exec(styles)?.[0] || '';

    expect(mobileMediaBlock).toContain('.docs-build-path__list');
    expect(mobileMediaBlock).toContain('grid-template-columns: 1fr;');
    expect(mobileMediaBlock).toContain('.docs-capabilities__grid');
    expect(mobileMediaBlock).toContain('.docs-capability--large');
    expect(mobileMediaBlock).toContain('grid-column: 1 / -1;');
  });
});
