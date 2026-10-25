# @stati/images

## 1.0.3

### Patch Changes

- move remaining scanner timing checks to the perf suites

## 1.0.2

### Patch Changes

- refresh benchmark baselines and drop the unchecked p95
- cut benchmark headroom to 25ms so 2x slowdowns fail

## 1.0.1

### Patch Changes

- update @stati/cli and @stati/core to version 2.0.0 in package.json and package-lock.json

## 1.0.0

### Major Changes

- 9b7c08d: First release of `@stati/images`, the optional image package for Stati. With `images.responsive`, every Markdown image and `stati.image()` becomes a `<picture>` with AVIF and WebP versions at several widths, encoded once with sharp and reused between builds. With `images.og`, every page gets an Open Graph image, drawn from an `og.eta` template with Satori, or from the built-in card when there is none. Requires `@stati/core` 1.28 or later.
