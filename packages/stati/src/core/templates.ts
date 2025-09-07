import { Eta } from 'eta';
import { join } from 'path';
import { pathExists } from 'fs-extra';
import type { StatiConfig, PageModel } from '../types.js';

export function createTemplateEngine(config: StatiConfig): Eta {
  const templateDir = join(process.cwd(), config.templateDir!);

  const eta = new Eta({
    views: templateDir,
    cache: process.env.NODE_ENV === 'production',
  });

  // Add custom filters if provided
  if (config.eta?.filters) {
    Object.entries(config.eta.filters).forEach(([name, fn]) => {
      (eta as Eta & { filters: Record<string, unknown> }).filters[name] = fn;
    });
  }

  return eta;
}

export async function renderPage(
  page: PageModel,
  body: string,
  config: StatiConfig,
  eta: Eta,
): Promise<string> {
  const layoutName = page.frontMatter.layout || 'default';
  const layoutPath = `${layoutName}.eta`;

  const context = {
    site: config.site,
    page: {
      ...page.frontMatter,
      path: page.url,
      content: body,
    },
    content: body,
  };

  try {
    const templateDir = join(process.cwd(), config.templateDir!);
    const fullLayoutPath = join(templateDir, layoutPath);

    if (!(await pathExists(fullLayoutPath))) {
      console.warn(`Template not found: ${layoutPath}, using fallback`);
      return createFallbackHtml(page, body);
    }

    return await eta.renderAsync(layoutPath, context);
  } catch (error) {
    console.error(`Error rendering layout ${layoutPath}:`, error);
    return createFallbackHtml(page, body);
  }
}

function createFallbackHtml(page: PageModel, body: string): string {
  const title = page.frontMatter.title || 'Untitled';
  const description = page.frontMatter.description || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]!);
}
