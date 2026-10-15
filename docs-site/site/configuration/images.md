---
title: 'Images'
description: 'Image sizes and lazy loading built in, plus responsive AVIF and WebP images and Open Graph cards with @stati/images.'
order: 9
seo:
  title: 'Image configuration'
---

# Images

Stati gives every image in your Markdown its width and height and loads it lazily, with no configuration. The optional `@stati/images` package adds two features that need an image encoder: responsive AVIF and WebP images, and an Open Graph image for every page.

| | Built in | With `@stati/images` |
|---|---|---|
| Markdown images | `width`, `height`, `loading="lazy"`, `decoding="async"` | `<picture>` with AVIF and WebP at several widths |
| Images next to a page | Copied to the output | Same, plus responsive variants |
| Link previews | `og:image` from front matter | A generated card for every page |
| Configuration | None | `images.responsive`, `images.og` |

## Built-in behavior

When Stati renders a Markdown image such as `![Harbour at dawn](/images/harbour.jpg)`, it reads the image's size from the file and writes:

```html
<img src="/images/harbour.jpg" alt="Harbour at dawn" width="1600" height="900" loading="lazy" decoding="async">
```

The `width` and `height` let the browser reserve space before the image loads, so the page does not shift. Stati reads PNG, JPEG, GIF, WebP and AVIF files, and swaps the width and height of photos that are rotated by their EXIF orientation.

- **Where images are found.** A path that starts with `/` is read from your static directory (`public/`). A relative path such as `./harbour.jpg` is read next to the page's Markdown file, so a post's images can live in the post's folder. Stati copies those images to `/_img/` under a name that changes with the file's content.
- **The first image.** When a page's first image sits in its first few blocks, it loads eagerly with `fetchpriority="high"`, because it is likely the largest thing on screen. Set `images.eagerFirst: false` to load every image lazily.
- **Images left alone.** Remote URLs, `data:` URIs, SVG files and other formats are written as authored. Add `?raw` to a path to opt one image out: `![Logo](/images/logo.png?raw)`. Raw `<img>` tags in Markdown are not changed.
- **Missing files.** Stati warns and writes the image as authored. The page rebuilds once the file appears.

Your stylesheet should let images shrink with their container without stretching. The starters already include:

```css
img {
  max-width: 100%;
  height: auto;
}
```

> **Note:** Without `height: auto`, an image with a `height` attribute keeps that height when `max-width` narrows it. If your site's CSS lacks the rule, add it, or turn the built-in behavior off with `images: false`.

### Turning it off

```typescript
export default defineConfig({
  // site: { … },
  images: false,
});
```

Markdown images are then written exactly as authored, and images next to pages are not copied.

### Images in templates

Use `stati.image()` for images that come from layouts and partials, such as a post's cover image. It returns HTML, so print it with `<%~ %>`:

```eta
<%~ stati.image(stati.page.cover, { alt: stati.page.coverAlt, priority: true }) %>
```

| Option | Description |
|---|---|
| `alt` | Alternative text. Use `''` for a decorative image; Stati warns when `alt` is missing. |
| `priority` | Load eagerly with `fetchpriority="high"`, for the main image above the fold. |
| `sizes` | The `sizes` attribute for responsive images. |
| `class`, `title` | Added to the `<img>`. |

Paths resolve like Markdown images: from `public/` when they start with `/`, otherwise next to the page's Markdown file. An empty `src` returns an empty string, so templates don't need a guard.

## Responsive images

Install the package, then turn on `images.responsive`:

```bash
npm install --save-dev @stati/images
```

```typescript
export default defineConfig({
  // site: { … },
  images: {
    responsive: true,
  },
});
```

Each Markdown image and `stati.image()` becomes a `<picture>` with an AVIF and a WebP version at several widths, and a fallback in the image's own format:

```html
<picture>
  <source type="image/avif" srcset="/_img/harbour-3f9a2c1b-480.avif 480w, /_img/harbour-3f9a2c1b-960.avif 960w, /_img/harbour-3f9a2c1b-1440.avif 1440w" sizes="100vw">
  <source type="image/webp" srcset="/_img/harbour-3f9a2c1b-480.webp 480w, …" sizes="100vw">
  <img src="/_img/harbour-3f9a2c1b-1440.jpg" srcset="/_img/harbour-3f9a2c1b-480.jpg 480w, …" sizes="100vw"
       alt="Harbour at dawn" width="1600" height="900" loading="lazy" decoding="async">
</picture>
```

```typescript
images: {
  responsive: {
    widths: [480, 960, 1440],
    formats: ['avif', 'webp'],
    quality: { avif: 50, webp: 75, jpeg: 80 },
    sizes: '(min-width: 768px) 720px, 100vw',
  },
},
```

- **Widths** larger than the image itself are skipped, and the image's own width is added when it is smaller than the largest width. Images are never enlarged.
- **The fallback** keeps the image's format: JPEG stays JPEG, PNG stays PNG and keeps its transparency, and GIF becomes PNG. PNG is lossless unless you set `quality.png`.
- **`sizes`** tells the browser how wide the image is shown. The default, `100vw`, suits full-width images; give the real width of your content column for smaller downloads on large screens.
- **Animated images** (GIF, WebP, PNG and AVIF) keep the built-in behavior.

File names include a hash of the image and the options, so a changed image or setting gets a new URL and generated files can be cached forever.

## Open Graph images

With `images.og`, every page gets an image for link previews on social networks and chat apps:

```typescript
export default defineConfig({
  site: { title: 'My site', baseUrl: 'https://example.com' },
  images: {
    og: true,
  },
});
```

Stati adds `og:image`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image` to each page, pointing to a 1200 by 630 PNG under `/_img/og/`. Social networks need absolute URLs, so production builds stop with an error unless `site.baseUrl` is your site's public address.

A page keeps the image it sets in front matter, and `false` gives it none:

```yaml
---
title: Release 2.0
seo:
  openGraph:
    image: /images/release-2.png # used as given
---
```

```yaml
seo:
  openGraph:
    image: false # no image, not even a generated one
```

To skip whole sections, use `exclude`:

```typescript
images: {
  og: {
    exclude: ['/404', '/drafts/**'],
  },
},
```

### Designing the card

Without a template, pages use the card built into `@stati/images`: the site name, the page's section, its title and description, and its address, in Stati's own typefaces.

To design your own, add `og.eta` to `site/`. For a section with its own card, add one to the section's folder, such as `site/blog/og.eta`; each page uses the nearest one. The built-in card, in `node_modules/@stati/images/templates/og.eta`, is a good starting point.

```eta
<div style="display:flex;flex-direction:column;justify-content:flex-end;width:100%;height:100%;padding:72px;background-color:#0b1220;color:#ffffff;font-family:Inter">
  <div style="display:flex;font-size:64px;font-weight:500;line-height:1.1"><%= stati.page.title %></div>
  <div style="display:flex;margin-top:24px;font-size:28px;opacity:0.7"><%= stati.site.title %></div>
</div>
```

Card templates receive the same `stati` object as layouts, with two differences: `stati.content` is empty, because cards don't show the page body, and `stati.og` holds the card's `width` and `height`. Partials and filters work as in layouts.

Cards are drawn by [Satori](https://github.com/vercel/satori), which supports a subset of CSS:

- Inline `style` attributes only: no classes, no `<style>` blocks, no Sass.
- Flexbox layout. Every element with more than one child needs `display:flex`; grid is not supported.
- Images from your site work: `<img src="/images/logo.png">` is read from `public/`, and a relative `src` from the template's folder. `stati.image()` works as it does in layouts, so a card can show a post's cover image; cards always use the original file.

A template Satori can't draw stops the build in the dev server's error overlay; in production builds the page is written without a generated image and the error is logged.

### Fonts

Archivo (800), Inter (400 and 500) and Fira Code (400) are always available, with Latin, Latin-1 and Latin Extended-A characters. Add fonts with `images.og.fonts`; paths are relative to the project, and the files must be TTF, OTF or WOFF, because Satori can't read WOFF2:

```typescript
images: {
  og: {
    fonts: [
      { name: 'Young Serif', path: './og/fonts/young-serif-regular.woff', weight: 400 },
    ],
  },
},
```

Text in other scripts needs a font that covers it.

### Using the image in layouts

Stati's SEO injection and `stati.generateSEO()` add the image's tags for you. A layout that writes its own Open Graph tags can read the image as `stati.ogImage`, with `url` (absolute), `path`, `width`, `height` and `alt`:

```eta
<% if (stati.ogImage) { %>
  <meta property="og:image" content="<%= stati.ogImage.url %>">
<% } %>
```

## Dev server

Encoding images takes time, so by default the dev server skips responsive images and Open Graph cards and shows images with their built-in attributes. Set `images.dev: 'full'` to generate them in the dev server too. The package must be installed either way.

| `images.dev` | Responsive images | Open Graph cards |
|---|---|---|
| `'fast'` (default) | Original image with `width` and `height` | Only images set in front matter |
| `'full'` | Generated | Generated |

## Caching and cleanup

- Each image is encoded once. Later builds reuse the files in `dist/_img/`, tracked in `.stati/images/manifest.json`.
- Replacing an image rebuilds only the pages that show it. A card is redrawn when anything it shows changes, such as the page title or the site name, but not when only the page body changes.
- `stati build` deletes generated images that no page uses any more. It only deletes files it generated, never files from `public/`. Avoid a `public/_img/` folder, because it shares its URL with generated images.
- Hosts that start each build from a clean checkout encode every image again. To save that time, keep `dist/_img` and `.stati` in your host's build cache.

## Option reference

| Option | Type | Default | Description |
|---|---|---|---|
| `images` | `false \| object` | `{}` | `false` turns off the built-in behavior |
| `images.eagerFirst` | `boolean` | `true` | Load the first image near the top of a page eagerly |
| `images.responsive` | `boolean \| object` | `false` | Responsive variants; needs `@stati/images` |
| `images.responsive.widths` | `number[]` | `[480, 960, 1440]` | Candidate widths in pixels |
| `images.responsive.formats` | `('avif' \| 'webp')[]` | `['avif', 'webp']` | Modern formats offered as `<source>` elements |
| `images.responsive.quality` | `{ avif?, webp?, jpeg?, png? }` | `{ avif: 50, webp: 75, jpeg: 80 }` | Encoder quality from 1 to 100; PNG is lossless unless set |
| `images.responsive.sizes` | `string` | `'100vw'` | Default `sizes` attribute |
| `images.og` | `boolean \| object` | `false` | Open Graph cards; needs `@stati/images` |
| `images.og.template` | `string` | `'og.eta'` | Template file name, looked up from the page's folder up to `site/` |
| `images.og.width` | `number` | `1200` | Card width in pixels |
| `images.og.height` | `number` | `630` | Card height in pixels |
| `images.og.format` | `'png' \| 'jpeg'` | `'png'` | Card format |
| `images.og.fonts` | `{ name, path, weight?, style? }[]` | `[]` | Fonts added to the bundled ones |
| `images.og.exclude` | `string[]` | `[]` | URL patterns of pages that get no card |
| `images.dev` | `'fast' \| 'full'` | `'fast'` | Whether the dev server generates images |

## Troubleshooting

### `images.responsive requires @stati/images`

A feature that needs the package is on, but the package is not installed. Run `npm install --save-dev @stati/images`, or turn the feature off. The same applies to `images.og`.

### `@stati/images … is not compatible with @stati/core …`

Update both packages to their latest versions.

### `images.og needs site.baseUrl set to your site's public address`

Set `site.baseUrl` to the address the site is published at, such as `https://example.com`.

### `Could not load sharp for linux-x64`

The image encoder has a native part for each operating system. If your lockfile was created on another system, run `npm install` again so it lists every platform's optional `@img/sharp-*` package. See the [sharp installation guide](https://sharp.pixelplumbing.com/install).

### An image shows without variants and the build logged a warning

Encoding failed, for example because the file is damaged. The page shows the original image and is rebuilt on the next build.
