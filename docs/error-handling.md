# Error Handling in Stati

Stati implements a comprehensive error handling strategy designed to provide graceful failures, clear error messages, and robust recovery mechanisms. This document describes the error handling approach, error codes, and best practices for developers using Stati.

## Error Handling Philosophy

Stati follows these principles for error handling:

1. **Graceful Degradation**: When possible, Stati continues operation with fallback behavior rather than crashing
2. **Clear Error Messages**: All errors include actionable information to help users resolve issues
3. **Fail Fast**: Configuration and critical setup errors are caught early in the build process
4. **Recovery Mechanisms**: Built-in fallbacks ensure partial builds can still succeed

## Error Categories

### 1. Configuration Errors

**When they occur**: During configuration loading and validation

**Error handling**: Immediate failure with detailed error message

**Common scenarios**:

- Configuration file not found or unreadable
- Invalid configuration syntax (malformed JSON/JS)
- Missing required configuration fields
- Invalid configuration values

**Example error handling**:

```typescript
try {
  const config = await loadConfig(configPath);
} catch (error) {
  console.error('Configuration loading failed:', error.message);
  process.exit(1);
}
```

**Error codes**: `CONFIG_NOT_FOUND`, `CONFIG_INVALID_SYNTAX`, `CONFIG_VALIDATION_FAILED`

### 2. Content Loading Errors

**When they occur**: During content discovery and front matter parsing

**Error handling**: Skip problematic files and continue with build

**Common scenarios**:

- Content directory not found or inaccessible
- Individual content files with invalid front matter
- File system permission errors
- Corrupted content files

**Example error handling**:

```typescript
try {
  const pages = await loadContent(config, includeDrafts);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.warn(`Content directory not found: ${config.srcDir}`);
    return [];
  }
  throw error;
}
```

**Error codes**: `CONTENT_DIR_NOT_FOUND`, `FRONTMATTER_INVALID`, `FILE_READ_ERROR`

### 3. Markdown Processing Errors

**When they occur**: During markdown-to-HTML conversion

**Error handling**: Log error and use original content as fallback

**Common scenarios**:

- Markdown processor initialization failure
- Invalid markdown syntax
- Plugin configuration errors

**Example error handling**:

```typescript
try {
  return renderMarkdown(content, markdownProcessor);
} catch (error) {
  console.error(`Markdown processing failed for ${page.sourcePath}:`, error.message);
  return `<pre>${escapeHtml(content)}</pre>`; // Fallback to plain text
}
```

**Error codes**: `MARKDOWN_PROCESSOR_INIT_FAILED`, `MARKDOWN_RENDER_ERROR`

### 4. Template Rendering Errors

**When they occur**: During template processing and HTML generation

**Error handling**: Use built-in fallback template

**Common scenarios**:

- Template file not found
- Template syntax errors
- Template rendering failures
- Missing template data

**Example error handling**:

```typescript
try {
  return await eta.renderAsync(layoutPath, context);
} catch (error) {
  console.error(`Error rendering layout ${layoutPath}:`, error);
  return createFallbackHtml(page, body); // Built-in fallback template
}
```

**Error codes**: `TEMPLATE_NOT_FOUND`, `TEMPLATE_SYNTAX_ERROR`, `TEMPLATE_RENDER_ERROR`

### 5. File System Errors

**When they occur**: During output file writing and static asset copying

**Error handling**: Immediate failure (these are critical for build success)

**Common scenarios**:

- Output directory permission errors
- Disk space exhausted
- File system corruption
- Directory creation failures

**Example error handling**:

```typescript
try {
  await ensureDir(dirname(outputPath));
  await writeFile(outputPath, finalHtml, 'utf-8');
} catch (error) {
  console.error(`Failed to write ${outputPath}:`, error.message);
  throw new StatiError('FILE_WRITE_ERROR', `Cannot write output file: ${error.message}`);
}
```

**Error codes**: `PERMISSION_DENIED`, `DISK_SPACE_FULL`, `OUTPUT_DIR_ERROR`

### 6. Build Hook Errors

**When they occur**: During execution of user-defined build hooks

**Error handling**: Immediate failure (hooks are user-controlled and should not fail silently)

**Common scenarios**:

- Hook function throws an exception
- Async hook rejection
- Hook timeout (if implemented)

**Example error handling**:

```typescript
try {
  if (config.hooks?.beforeRender) {
    await config.hooks.beforeRender({ page, config });
  }
} catch (error) {
  throw new StatiError('HOOK_ERROR', `beforeRender hook failed: ${error.message}`);
}
```

**Error codes**: `HOOK_BEFORE_ALL_FAILED`, `HOOK_AFTER_ALL_FAILED`, `HOOK_BEFORE_RENDER_FAILED`, `HOOK_AFTER_RENDER_FAILED`

## StatiError Class

Stati uses a custom error class to provide structured error information:

```typescript
class StatiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'StatiError';
  }
}
```

### Error Code Categories

Error codes follow a consistent naming pattern:

- **CONFIG\_**: Configuration-related errors
- **CONTENT\_**: Content loading and processing errors
- **MARKDOWN\_**: Markdown processing errors
- **TEMPLATE\_**: Template rendering errors
- **FILE\_**: File system operation errors
- **HOOK\_**: Build hook execution errors
- **ISG\_**: Incremental Static Generation errors (future)

## Fallback Mechanisms

### Template Fallback

When a template cannot be found or fails to render, Stati uses a built-in fallback template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{page.title}</title>
    <meta name="description" content="{page.description}" />
  </head>
  <body>
    <main>{rendered_content}</main>
  </body>
</html>
```

### Content Fallback

When markdown processing fails, the original content is wrapped in `<pre>` tags with HTML escaping.

### Navigation Fallback

If navigation building fails, an empty navigation array is provided to templates.

## Error Reporting and Logging

### Console Output

Stati uses colored console output to distinguish error types:

- **Errors**: Red text, logged to stderr
- **Warnings**: Yellow text, logged to stdout
- **Info**: Standard text, logged to stdout

### Error Context

Error messages include relevant context:

```javascript
console.error(`Error rendering layout ${layoutPath} for page ${page.url}:`, error);
```

### Build Statistics

Build errors are tracked in build statistics when possible:

```typescript
interface BuildStats {
  // ... other stats
  errors: number;
  warnings: number;
  criticalErrors: string[];
}
```

## Best Practices for Users

### 1. Configuration Validation

Always validate your configuration in development:

```bash
stati build --config ./stati.config.js
```

### 2. Template Testing

Test templates with minimal content to catch syntax errors early.

### 3. Content Validation

Use consistent front matter schemas across your content files.

### 4. Hook Error Handling

Implement proper error handling in build hooks:

```typescript
export default {
  hooks: {
    beforeRender: async (ctx) => {
      try {
        // Your hook logic
      } catch (error) {
        console.error('Hook failed:', error);
        throw error; // Re-throw to stop build
      }
    },
  },
};
```

### 5. Gradual Rollout

When making significant changes:

1. Test with a subset of content first
2. Use `--include-drafts` flag to test draft content
3. Monitor error output during builds

## Error Recovery

### Partial Build Success

Stati attempts to build as many pages as possible even when individual pages fail. This allows you to:

- Identify and fix problematic content incrementally
- Deploy partial updates while fixing remaining issues
- Maintain site functionality during content updates

### Build Interruption Recovery

If a build is interrupted:

1. The `.stati` cache directory preserves incremental progress
2. Static assets are copied atomically
3. Subsequent builds resume from a clean state

## Debugging

### Verbose Mode

Use verbose logging to debug errors:

```bash
DEBUG=stati:* stati build
```

### Error Isolation

To isolate errors:

1. Build with a subset of content
2. Use `--clean` flag to ensure fresh state
3. Check individual file processing with targeted content

### Common Troubleshooting

**Build fails immediately**:

- Check configuration file syntax
- Verify directory permissions
- Ensure required directories exist

**Some pages missing from output**:

- Check for draft flags in front matter
- Verify content directory structure
- Look for template resolution errors

**Template rendering issues**:

- Verify template syntax in isolation
- Check template data availability
- Review template file permissions

## Related Documentation

- [Configuration Guide](./configuration.md)
- [Template System](./templates.md)
- [Build Process](./build-process.md)
- [Plugin Development](./plugins.md)
