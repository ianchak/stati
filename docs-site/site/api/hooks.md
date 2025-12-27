---
title: 'Build Hooks'
description: 'Learn how to use build hooks to customize the Stati build process.'
order: 2
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
        pageCount: ctx.pages.length
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

      // Add custom metadata based on URL
      if (ctx.page.url.startsWith('/blog/')) {
        ctx.page.frontMatter.section = 'blog';
      }
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

      // Extract data for search index or analytics
      const wordCount = ctx.page.content.split(/\s+/).length;
      await trackPageMetrics({
        url: ctx.page.url,
        title: ctx.page.frontMatter.title,
        wordCount: wordCount
      });
    }
  }
});
```

## Hook Context

Each hook receives a context object with different properties:

### `beforeAll` and `afterAll` Context

```typescript
interface BuildContext {
  config: StatiConfig;          // Build configuration
  pages: PageModel[];           // All discovered pages
}
```

### `beforeRender` and `afterRender` Context

```typescript
interface PageContext {
  page: PageModel;             // Current page being processed
  config: StatiConfig;         // Build configuration
}
```

## Advanced Hook Patterns

### External State Management

Since hook contexts don't support shared state, use module-level state or external storage for sharing data between hooks:

```javascript
// Module-level state
let sharedBuildData = {};

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Fetch data once, store in module state
      sharedBuildData = {
        posts: await fetchBlogPosts(),
        authors: await fetchAuthors(),
        buildId: generateBuildId()
      };
    },

    beforeRender: async (ctx) => {
      // Access shared data from module state
      ctx.page.frontMatter.buildId = sharedBuildData.buildId;

      // Add page-specific processing
      if (ctx.page.frontMatter.type === 'post') {
        ctx.page.frontMatter.section = 'blog';
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
      // Only log in production builds
      if (process.env.NODE_ENV === 'production') {
        console.log(`Built production page: ${ctx.page.url}`);
      }
    }
  }
});
```

### Error Handling in Hooks

```javascript
let fallbackData = null;

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      try {
        fallbackData = await fetchExternalData();
      } catch (error) {
        console.warn('Failed to fetch external data, using fallback:', error.message);
        fallbackData = { fallback: true };
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
let sharedData = {};

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Parallel data fetching
      const [posts, authors, categories] = await Promise.all([
        fetchPosts(),
        fetchAuthors(),
        fetchCategories()
      ]);

      sharedData = { posts, authors, categories };
    },

    afterAll: async (ctx) => {
      // Parallel deployment tasks
      await Promise.all([
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

let publishedPosts = [];

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      publishedPosts = ctx.pages
        .filter(isPost)
        .filter(isPublished)
        .sort((a, b) => new Date(b.frontMatter.date) - new Date(a.frontMatter.date));
    },

    beforeRender: async (ctx) => {
      // Use the filtered posts in page hooks
      if (ctx.page.url === '/blog/') {
        ctx.page.frontMatter.recentPosts = publishedPosts.slice(0, 5);
      }
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
let allPosts = [];

function intersection(arr1, arr2) {
  return arr1.filter(item => arr2.includes(item));
}

export default defineConfig({
  hooks: {
    beforeAll: async (ctx) => {
      // Store all posts for use in page hooks
      allPosts = ctx.pages.filter(p => p.frontMatter.type === 'post');
    },

    beforeRender: async (ctx) => {
      if (ctx.page.frontMatter.type !== 'post') return;

      // Find related posts by tags
      const currentTags = ctx.page.frontMatter.tags || [];

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

Build hooks provide powerful extensibility while maintaining Stati's performance and simplicity. Use them to integrate external services, process content dynamically, and customize the build pipeline to match your specific needs.
