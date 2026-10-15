# @stati/images

## 1.0.0

### Major Changes

- 9b7c08d: First release of `@stati/images`, the optional image package for Stati. With `images.responsive`, every Markdown image and `stati.image()` becomes a `<picture>` with AVIF and WebP versions at several widths, encoded once with sharp and reused between builds. With `images.og`, every page gets an Open Graph image, drawn from an `og.eta` template with Satori, or from the built-in card when there is none. Requires `@stati/core` 1.28 or later.
