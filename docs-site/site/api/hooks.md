---
title: 'Build Hooks'
description: 'Learn about Stati build lifecycle hooks and how to extend the build process.'
---

# Build Hooks

Build hooks allow you to inject custom logic at various stages of the Stati build process. They provide powerful extension points for preprocessing content, integrating external services, generating additional files, and customizing the build pipeline.

## Hook Lifecycle

Stati executes hooks in the following order:

```text
1. beforeAll    → Called once at build start
2. Content Discovery & Processing
3. beforeRender → Called for each page
4. Template Rendering
5. afterRender  → Called for each page
6. Static Asset Copying
7. afterAll     → Called once at build end
```

## Hook Types

### `beforeAll`

Called once before starting the build process.

**Use cases:**
- Initialize external services
- Fetch remote data
- Validate environment setup
- Generate build metadata

```javascript
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      console.log(`Starting build with ${ctx.pages.length} pages`);

      // Initialize external services
      await initializeAnalytics();

      // Fetch remote data
      const apiData = await fetch('https://api.example.com/data');
      ctx.globalData = await apiData.json();

      // Validate environment
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable is required');
      }
    }
  }
});
```

### `afterAll`

Called once after completing the build process.

**Use cases:**
- Generate sitemaps and RSS feeds
- Deploy to CDN or hosting service
- Send build notifications
- Clean up temporary resources

```javascript
export default defineConfig({
  hooks: {
    afterAll: async (ctx) => {
      console.log(`Build complete! Generated ${ctx.pages.length} pages`);

      // Generate sitemap
      await generateSitemap(ctx.pages, ctx.config.site.baseUrl);

      // Generate RSS feed
      await generateRSSFeed(ctx.pages.filter(p => p.frontMatter.type === 'post'));

      // Deploy to CDN
      if (process.env.NODE_ENV === 'production') {
        await deployToCDN(ctx.config.outDir);
      }

      // Send notification
      await sendBuildNotification({
        status: 'success',
        pageCount: ctx.pages.length,
        buildTime: ctx.buildStats.duration
      });
    }
  }
});
```

### `beforeRender`

Called before rendering each individual page.

**Use cases:**
- Add dynamic data to pages
- Calculate reading time or word count
- Inject build metadata
- Modify page content

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      // Add build timestamp
      ctx.page.frontMatter.buildTime = new Date().toISOString();

      // Calculate reading time
      const wordCount = ctx.page.content.split(/\s+/).length;
      ctx.page.frontMatter.readingTime = Math.ceil(wordCount / 200);

      // Add previous/next navigation for blog posts
      if (ctx.page.url.startsWith('/blog/')) {
        const blogPosts = ctx.pages
          .filter(p => p.url.startsWith('/blog/') && p.url !== '/blog/')
          .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));

        const currentIndex = blogPosts.findIndex(p => p.url === ctx.page.url);
        ctx.page.frontMatter.prevPost = blogPosts[currentIndex + 1] || null;
        ctx.page.frontMatter.nextPost = blogPosts[currentIndex - 1] || null;
      }

      // Inject global data
      ctx.page.frontMatter.siteData = ctx.globalData;
    }
  }
});
```

### `afterRender`

Called after rendering each individual page.

**Use cases:**
- Post-process generated HTML
- Validate output
- Generate search indices
- Optimize images

```javascript
export default defineConfig({
  hooks: {
    afterRender: async (ctx) => {
      console.log(`Rendered page: ${ctx.page.url}`);

      // Minify HTML in production
      if (process.env.NODE_ENV === 'production') {
        ctx.html = await minifyHTML(ctx.html);
      }

      // Extract headings for search index
      const headings = extractHeadings(ctx.html);
      await addToSearchIndex({
        url: ctx.page.url,
        title: ctx.page.frontMatter.title,
        content: ctx.page.content,
        headings: headings
      });

      // Validate HTML
      const validationErrors = await validateHTML(ctx.html);
      if (validationErrors.length > 0) {
        console.warn(`HTML validation warnings for ${ctx.page.url}:`, validationErrors);
      }
    }
  }
});
```

## Hook Context

Each hook receives a context object with different properties:

### `beforeAll` and `afterAll` Context

```typescript
interface GlobalHookContext {
  pages: PageModel[];           // All discovered pages
  config: StatiConfig;          // Build configuration
  buildStats: BuildStats;       // Build timing and statistics
  globalData?: any;            // Shared data between hooks
}
```

### `beforeRender` and `afterRender` Context

```typescript
interface PageHookContext {
  page: PageModel;             // Current page being processed
  config: StatiConfig;         // Build configuration
  globalData?: any;           // Shared data from beforeAll
  html?: string;              // Generated HTML (afterRender only)
}
```

## Advanced Hook Patterns

### Shared Data Between Hooks

```javascript
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Fetch data once, share across all pages
      ctx.globalData = {
        posts: await fetchBlogPosts(),
        authors: await fetchAuthors(),
        buildId: generateBuildId()
      };
    },

    beforeRender: async (ctx) => {
      // Access shared data
      const { posts, authors } = ctx.globalData;

      // Add related posts
      if (ctx.page.frontMatter.type === 'post') {
        ctx.page.frontMatter.relatedPosts = findRelatedPosts(
          ctx.page,
          posts,
          3
        );
      }
    }
  }
});
```

### Conditional Hook Execution

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      // Only process blog posts
      if (!ctx.page.url.startsWith('/blog/')) {
        return;
      }

      // Add blog-specific data
      ctx.page.frontMatter.category = extractCategory(ctx.page.url);
      ctx.page.frontMatter.tags = normalizeTags(ctx.page.frontMatter.tags || []);
    },

    afterRender: async (ctx) => {
      // Only minify production builds
      if (process.env.NODE_ENV !== 'production') {
        return;
      }

      ctx.html = await minifyHTML(ctx.html);
    }
  }
});
```

### Error Handling in Hooks

```javascript
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      try {
        ctx.globalData = await fetchExternalData();
      } catch (error) {
        console.warn('Failed to fetch external data, using fallback:', error.message);
        ctx.globalData = { fallback: true };
      }
    },

    beforeRender: async (ctx) => {
      try {
        await processPageData(ctx.page);
      } catch (error) {
        console.error(`Failed to process page ${ctx.page.url}:`, error);
        // Decide whether to continue or fail the build
        if (error.critical) {
          throw error; // Stop the build
        }
        // Otherwise continue with default data
      }
    }
  }
});
```

### Async Hook Patterns

```javascript
export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Parallel data fetching
      const [posts, authors, categories] = await Promise.all([
        fetchPosts(),
        fetchAuthors(),
        fetchCategories()
      ]);

      ctx.globalData = { posts, authors, categories };
    },

    afterAll: async (ctx) => {
      // Parallel deployment tasks
      await Promise.all([
        generateSitemap(ctx.pages),
        generateRSSFeed(ctx.pages),
        uploadToS3(ctx.config.outDir),
        purgeCloudflareCache()
      ]);
    }
  }
});
```

## Hook Utilities

### Page Filtering Helpers

```javascript
const isPost = (page) => page.frontMatter.type === 'post';
const isDraft = (page) => page.frontMatter.draft === true;
const isPublished = (page) => !isDraft(page);
const isBlogContent = (page) => page.url.startsWith('/blog/');

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      const publishedPosts = ctx.pages
        .filter(isPost)
        .filter(isPublished)
        .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));

      ctx.globalData = { publishedPosts };
    }
  }
});
```

### Content Processing Helpers

```javascript
function extractHeadings(html) {
  const headings = [];
  const regex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].trim(),
      id: slugify(match[2])
    });
  }

  return headings;
}

function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}
```

## Real-World Examples

### Blog with Related Posts

```javascript
export default defineConfig({
  hooks: {
    beforeRender: async (ctx) => {
      if (ctx.page.frontMatter.type !== 'post') return;

      // Find related posts by tags
      const currentTags = ctx.page.frontMatter.tags || [];
      const allPosts = ctx.pages.filter(p => p.frontMatter.type === 'post');

      const relatedPosts = allPosts
        .filter(p => p.url !== ctx.page.url)
        .map(p => ({
          ...p,
          score: intersection(currentTags, p.frontMatter.tags || []).length
        }))
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      ctx.page.frontMatter.relatedPosts = relatedPosts;
    }
  }
});
```

### Search Index Generation

```javascript
let searchIndex = [];

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      searchIndex = []; // Reset index
    },

    afterRender: async (ctx) => {
      // Skip non-content pages
      if (ctx.page.url.includes('404') || ctx.page.url.includes('sitemap')) {
        return;
      }

      // Extract searchable content
      const textContent = stripHtml(ctx.html);
      const headings = extractHeadings(ctx.html);

      searchIndex.push({
        url: ctx.page.url,
        title: ctx.page.frontMatter.title,
        description: ctx.page.frontMatter.description,
        content: textContent.substring(0, 500), // First 500 chars
        headings: headings.map(h => h.text),
        tags: ctx.page.frontMatter.tags || []
      });
    },

    afterAll: async (ctx) => {
      // Write search index
      await writeFile(
        path.join(ctx.config.outDir, 'search-index.json'),
        JSON.stringify(searchIndex, null, 2)
      );

      console.log(`Generated search index with ${searchIndex.length} entries`);
    }
  }
});
```

Build hooks provide powerful extensibility while maintaining Stati's performance and simplicity. Use them to integrate external services, process content dynamically, and customize the build pipeline to match your specific needs.
