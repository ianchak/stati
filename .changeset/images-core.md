---
'@stati/core': minor
---

Images get their size and lazy loading on every site. Markdown images now carry their intrinsic `width` and `height`, read from the file, plus `loading="lazy"` and `decoding="async"`, so pages no longer shift while images load. A page's first image near the top loads eagerly with `fetchpriority="high"`. Images next to a page's Markdown file (`./photo.jpg`) are copied to `/_img/`. In templates, `stati.image(src, { alt, sizes, priority })` renders the same markup.

Two new features use the new `@stati/images` package: `images.responsive` writes AVIF and WebP variants with `srcset`, and `images.og` generates an Open Graph image for every page from an `og.eta` template or a built-in card. A page can opt out with `seo.openGraph.image: false`. Turning either feature on without the package installed stops the build with an install command.

Upgrading: the first build after upgrading re-renders every page once. If your CSS sets `max-width` on images, make sure it also sets `height: auto`, or sized images stretch when narrowed. To keep images exactly as written, set `images: false`. An invalid `images` block now stops the build instead of falling back to the default configuration.
