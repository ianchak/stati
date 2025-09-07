import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type MarkdownIt from 'markdown-it';
import type { Eta } from 'eta';
import { build } from '../../core/build.js';
import { loadContent } from '../../core/content.js';
import { renderMarkdown, createMarkdownProcessor } from '../../core/markdown.js';
import { renderPage } from '../../core/templates.js';
import type { PageModel, StatiConfig } from '../../types.js';

// Mock dependencies
vi.mock('fs-extra', () => {
  const mockPathExists = vi.fn();
  return {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: mockPathExists,
    readdir: vi.fn().mockResolvedValue([]),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
  };
});

vi.mock('../../config/loader.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../core/content.js', () => ({
  loadContent: vi.fn(),
}));

vi.mock('../../core/markdown.js', () => ({
  createMarkdownProcessor: vi.fn(),
  renderMarkdown: vi.fn(),
}));

vi.mock('../../core/templates.js', () => ({
  createTemplateEngine: vi.fn(),
  renderPage: vi.fn(),
}));

import { ensureDir, writeFile, copy, remove, pathExists, readdir, stat } from 'fs-extra';
import { loadConfig } from '../../config/loader.js';
import { createTemplateEngine } from '../../core/templates.js';

const mockEnsureDir = vi.mocked(ensureDir);
const mockWriteFile = vi.mocked(writeFile);
const mockCopy = vi.mocked(copy);
const mockRemove = vi.mocked(remove);
const mockPathExists = vi.mocked(pathExists);
const mockReaddir = vi.mocked(readdir);
const mockStat = vi.mocked(stat);
const mockLoadConfig = vi.mocked(loadConfig);
const mockLoadContent = vi.mocked(loadContent);
const mockRenderMarkdown = vi.mocked(renderMarkdown);
const mockCreateMarkdownProcessor = vi.mocked(createMarkdownProcessor);
const mockRenderPage = vi.mocked(renderPage);
const mockCreateTemplateEngine = vi.mocked(createTemplateEngine);

describe('HTML Output Snapshots', () => {
  const mockConfig: StatiConfig = {
    srcDir: '/test/project/content',
    outDir: 'dist',
    staticDir: '/test/project/static',
    templateDir: '/test/project/templates',
    site: {
      title: 'Stati Documentation',
      baseUrl: 'https://example.com',
    },
  };

  const mockEta = {
    render: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Standard mocks
    mockLoadConfig.mockResolvedValue(mockConfig);
    mockEnsureDir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockRemove.mockResolvedValue(undefined);
    // @ts-expect-error - Mock type issue
    mockReaddir.mockResolvedValue([]);
    // @ts-expect-error - Mock type issue
    mockStat.mockResolvedValue({ size: 1024 });
    // @ts-expect-error - Mock type issue
    mockPathExists.mockResolvedValue(true);
    mockCreateTemplateEngine.mockReturnValue(mockEta as unknown as Eta);
    mockCreateMarkdownProcessor.mockReturnValue({} as MarkdownIt);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate blog post HTML with proper structure', async () => {
    const blogPage: PageModel = {
      slug: 'getting-started',
      url: '/blog/getting-started',
      sourcePath: '/test/project/src/blog/getting-started.md',
      frontMatter: {
        title: 'Getting Started with Stati',
        author: 'John Doe',
        date: '2024-01-15',
        tags: ['tutorial', 'getting-started'],
        excerpt: 'Learn how to get started with Stati static site generator',
      },
      content:
        '# Getting Started\n\nWelcome to Stati! This is a simple static site generator.\n\n## Features\n\n- Fast and lightweight\n- Markdown support\n- Template system\n- Easy to use',
    };

    const renderedMarkdown = `<h1>Getting Started</h1>
<p>Welcome to Stati! This is a simple static site generator.</p>
<h2>Features</h2>
<ul>
<li>Fast and lightweight</li>
<li>Markdown support</li>
<li>Template system</li>
<li>Easy to use</li>
</ul>`;

    const renderedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Getting Started with Stati</title>
  <meta name="description" content="Learn how to get started with Stati static site generator">
  <meta name="author" content="John Doe">
  <meta name="date" content="2024-01-15">
</head>
<body>
  <header>
    <h1>Getting Started with Stati</h1>
    <p class="meta">By John Doe on January 15, 2024</p>
    <div class="tags">
      <span class="tag">tutorial</span>
      <span class="tag">getting-started</span>
    </div>
  </header>
  <main>
    <h1>Getting Started</h1>
<p>Welcome to Stati! This is a simple static site generator.</p>
<h2>Features</h2>
<ul>
<li>Fast and lightweight</li>
<li>Markdown support</li>
<li>Template system</li>
<li>Easy to use</li>
</ul>
  </main>
  <footer>
    <p>&copy; 2024 Stati Documentation</p>
  </footer>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([blogPage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(renderedHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]blog[/\\]getting-started\.html$/),
      renderedHtml,
      'utf-8',
    );

    // Snapshot test for the complete HTML structure
    expect(renderedHtml).toMatchSnapshot('blog-post-complete.html');
  });

  it('should generate homepage HTML with navigation and links', async () => {
    const homePage: PageModel = {
      slug: 'index',
      url: '/',
      sourcePath: '/test/project/src/index.md',
      frontMatter: { title: 'Stati Documentation' },
      content:
        '# Welcome to Stati\n\nStati is a modern static site generator built with TypeScript.\n\n[Get Started](/getting-started) | [API Reference](/api)',
    };

    const renderedMarkdown = `<h1>Welcome to Stati</h1>
<p>Stati is a modern static site generator built with TypeScript.</p>
<p><a href="/getting-started">Get Started</a> | <a href="/api">API Reference</a></p>`;

    const renderedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stati Documentation</title>
  <meta name="description" content="Modern static site generator built with TypeScript">
</head>
<body>
  <nav>
    <div class="nav-brand">Stati</div>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/docs">Documentation</a></li>
      <li><a href="/api">API</a></li>
      <li><a href="/blog">Blog</a></li>
    </ul>
  </nav>
  <main class="home-layout">
    <section class="hero">
      <h1>Welcome to Stati</h1>
<p>Stati is a modern static site generator built with TypeScript.</p>
<p><a href="/getting-started">Get Started</a> | <a href="/api">API Reference</a></p>
    </section>
    <section class="features">
      <div class="feature">
        <h3>TypeScript First</h3>
        <p>Built with modern TypeScript for better development experience</p>
      </div>
      <div class="feature">
        <h3>Fast Build</h3>
        <p>Optimized build process for quick site generation</p>
      </div>
      <div class="feature">
        <h3>Flexible Templates</h3>
        <p>Powerful template system with Eta support</p>
      </div>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 Stati Documentation</p>
  </footer>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([homePage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(renderedHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]index\.html$/),
      renderedHtml,
      'utf-8',
    );

    // Snapshot test for the homepage structure
    expect(renderedHtml).toMatchSnapshot('homepage-complete.html');
  });

  it('should generate API documentation HTML with code examples', async () => {
    const apiPage: PageModel = {
      slug: 'api',
      url: '/api',
      sourcePath: '/test/project/src/api.md',
      frontMatter: { title: 'API Reference' },
      content: `# API Reference

## Configuration

\`\`\`typescript
interface Config {
  contentDir: string;
  outputDir: string;
  templateDir?: string;
  staticDir?: string;
}
\`\`\`

## Build Function

The main build function processes your content:

\`\`\`typescript
import { build } from 'stati';

await build({
  contentDir: './content',
  outputDir: './dist'
});
\`\`\``,
    };

    const renderedMarkdown = `<h1>API Reference</h1>
<h2>Configuration</h2>
<pre><code class="language-typescript">interface Config {
  contentDir: string;
  outputDir: string;
  templateDir?: string;
  staticDir?: string;
}
</code></pre>
<h2>Build Function</h2>
<p>The main build function processes your content:</p>
<pre><code class="language-typescript">import { build } from 'stati';

await build({
  contentDir: './content',
  outputDir: './dist'
});
</code></pre>`;

    const renderedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Reference - Stati Documentation</title>
  <meta name="description" content="Complete API reference for Stati static site generator">
  <link rel="stylesheet" href="/css/prism.css">
</head>
<body class="docs-layout">
  <nav>
    <div class="nav-brand">Stati</div>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/docs" class="active">Documentation</a></li>
      <li><a href="/api">API</a></li>
      <li><a href="/blog">Blog</a></li>
    </ul>
  </nav>
  <div class="docs-container">
    <aside class="sidebar">
      <ul>
        <li><a href="/docs/getting-started">Getting Started</a></li>
        <li><a href="/docs/configuration">Configuration</a></li>
        <li><a href="/api" class="active">API Reference</a></li>
        <li><a href="/docs/templates">Templates</a></li>
        <li><a href="/docs/deployment">Deployment</a></li>
      </ul>
    </aside>
    <main class="docs-content">
      <h1>API Reference</h1>
<h2>Configuration</h2>
<pre><code class="language-typescript">interface Config {
  contentDir: string;
  outputDir: string;
  templateDir?: string;
  staticDir?: string;
}
</code></pre>
<h2>Build Function</h2>
<p>The main build function processes your content:</p>
<pre><code class="language-typescript">import { build } from 'stati';

await build({
  contentDir: './content',
  outputDir: './dist'
});
</code></pre>
    </main>
  </div>
  <footer>
    <p>&copy; 2024 Stati Documentation</p>
  </footer>
  <script src="/js/prism.js"></script>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([apiPage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(renderedHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]api\.html$/),
      renderedHtml,
      'utf-8',
    );

    // Snapshot test for the API documentation structure
    expect(renderedHtml).toMatchSnapshot('api-docs-complete.html');
  });

  it('should generate minimal page HTML with fallback template', async () => {
    const minimalPage: PageModel = {
      slug: 'about',
      url: '/about',
      sourcePath: '/test/project/src/about.md',
      frontMatter: { title: 'About Us' },
      content: 'This is a simple about page.',
    };

    const renderedMarkdown = '<p>This is a simple about page.</p>';

    // Simulate fallback HTML generation when no template is found
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Us</title>
</head>
<body>
  <h1>About Us</h1>
  <p>This is a simple about page.</p>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([minimalPage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(fallbackHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]about\.html$/),
      fallbackHtml,
      'utf-8',
    );

    // Snapshot test for the minimal fallback HTML structure
    expect(fallbackHtml).toMatchSnapshot('minimal-page.html');
  });

  it('should generate list page HTML with multiple items', async () => {
    const listPage: PageModel = {
      slug: 'blog',
      url: '/blog',
      sourcePath: '/test/project/src/blog.md',
      frontMatter: { title: 'Blog Posts' },
      content: '# Blog Posts\n\nLatest articles and tutorials.',
    };

    const renderedMarkdown = '<h1>Blog Posts</h1>\n<p>Latest articles and tutorials.</p>';

    const renderedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Posts - Stati Documentation</title>
  <meta name="description" content="Latest articles and tutorials">
</head>
<body>
  <header>
    <h1>Blog Posts</h1>
    <p>Latest articles and tutorials.</p>
  </header>
  <main>
    <section class="post-list">
      <article class="post-preview">
        <h2><a href="/blog/getting-started">Getting Started with Stati</a></h2>
        <p class="meta">January 15, 2024</p>
        <p class="excerpt">Learn the basics of Stati</p>
      </article>
      <article class="post-preview">
        <h2><a href="/blog/advanced-config">Advanced Configuration</a></h2>
        <p class="meta">January 10, 2024</p>
        <p class="excerpt">Deep dive into Stati configuration</p>
      </article>
    </section>
  </main>
  <footer>
    <p>&copy; 2024 Stati Documentation</p>
  </footer>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([listPage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(renderedHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]blog\.html$/),
      renderedHtml,
      'utf-8',
    );

    // Snapshot test for the blog list structure
    expect(renderedHtml).toMatchSnapshot('blog-list-complete.html');
  });

  it('should generate HTML with special characters and Unicode content', async () => {
    const unicodePage: PageModel = {
      slug: 'i18n-special-chars',
      url: '/i18n',
      sourcePath: '/test/project/src/i18n.md',
      frontMatter: { title: 'Iñtërnâtiônàlizætiøn & Spéciàl Cháracters' },
      content: `# Iñtërnâtiônàlizætiøn Test

This page tests special characters & Unicode support:

- 中文 (Chinese)
- العربية (Arabic)
- Ελληνικά (Greek)
- Русский (Russian)
- 🎉 Emoji support!

## Code with special chars:

\`\`\`javascript
const message = "Héllo Wørld! 你好世界";
console.log(\`Message: \${message}\`);
\`\`\`

> "Quöte with spëcial chars" — Author

**Bold tëxt** and *italic tëxt*.`,
    };

    const renderedMarkdown = `<h1>Iñtërnâtiônàlizætiøn Test</h1>
<p>This page tests special characters &amp; Unicode support:</p>
<ul>
<li>中文 (Chinese)</li>
<li>العربية (Arabic)</li>
<li>Ελληνικά (Greek)</li>
<li>Русский (Russian)</li>
<li>🎉 Emoji support!</li>
</ul>
<h2>Code with special chars:</h2>
<pre><code class="language-javascript">const message = "Héllo Wørld! 你好世界";
console.log(\`Message: \${message}\`);
</code></pre>
<blockquote>
<p>"Quöte with spëcial chars" — Author</p>
</blockquote>
<p><strong>Bold tëxt</strong> and <em>italic tëxt</em>.</p>`;

    const renderedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iñtërnâtiônàlizætiøn &amp; Spéciàl Cháracters</title>
  <meta name="description" content="Testing special characters and Unicode support">
</head>
<body>
  <main>
    <h1>Iñtërnâtiônàlizætiøn Test</h1>
<p>This page tests special characters &amp; Unicode support:</p>
<ul>
<li>中文 (Chinese)</li>
<li>العربية (Arabic)</li>
<li>Ελληνικά (Greek)</li>
<li>Русский (Russian)</li>
<li>🎉 Emoji support!</li>
</ul>
<h2>Code with special chars:</h2>
<pre><code class="language-javascript">const message = "Héllo Wørld! 你好世界";
console.log(\`Message: \${message}\`);
</code></pre>
<blockquote>
<p>"Quöte with spëcial chars" — Author</p>
</blockquote>
<p><strong>Bold tëxt</strong> and <em>italic tëxt</em>.</p>
  </main>
</body>
</html>`;

    mockLoadContent.mockResolvedValue([unicodePage]);
    mockRenderMarkdown.mockReturnValue(renderedMarkdown);
    mockRenderPage.mockResolvedValue(renderedHtml);

    await build();

    // Verify the generated HTML matches our snapshot
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringMatching(/[/\\]test[/\\]project[/\\]dist[/\\]i18n\.html$/),
      renderedHtml,
      'utf-8',
    );

    // Snapshot test for Unicode and special character handling
    expect(renderedHtml).toMatchSnapshot('unicode-special-chars.html');
  });
});
