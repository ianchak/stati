---
"@stati/core": minor
---

### Build-time search index generation

- Enable with `search: { enabled: true }` in config
- Generates JSON index with page sections, headings, breadcrumbs, and tags
- Auto-injects `<meta name="stati:search-index">` for client-side discovery
- Hash-based filenames for cache busting
- Configurable heading levels, content length, and exclusion patterns
- Access index path in templates via `stati.assets.searchIndexPath`
