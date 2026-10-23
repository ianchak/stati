# @stati/images

**Responsive AVIF and WebP images, and an Open Graph image for every page, for [Stati](https://stati.build).**

Stati already gives every Markdown image its intrinsic `width` and `height`, `loading="lazy"` and `decoding="async"`, with no configuration. This package adds the heavier work that needs an image encoder:

- **Responsive images.** Every Markdown image and every `stati.image()` becomes a `<picture>` with AVIF and WebP sources at several widths, plus a fallback in the original format.
- **Open Graph images.** Every page gets a social card rendered from an Eta template, so links shared on social platforms show a preview. There is a built-in card, and you can design your own in `og.eta`.

Encoding uses [sharp](https://sharp.pixelplumbing.com). Cards are laid out by [Satori](https://github.com/vercel/satori) and rasterized by sharp, with no headless browser, so builds work on Netlify, Vercel, Cloudflare Pages and GitHub Actions without system packages.

---

## Install

New sites can add it when they are created:

```bash
npx create-stati my-site --images
```

In an existing site:

```bash
npm install --save-dev @stati/images
```

Then turn on the features you want. Each one works on its own:

```ts
// stati.config.ts
import { defineConfig } from '@stati/core';

export default defineConfig({
  site: { title: 'My site', baseUrl: 'https://example.com' },
  images: {
    responsive: true,
    og: true,
  },
});
```

Turning on `images.responsive` or `images.og` without this package installed stops the build with a message that tells you to install it.

Requires `@stati/core` 1.28 or later and Node.js 22.12 or later.

---

## Responsive images

```ts
images: {
  responsive: {
    widths: [480, 960, 1440], // never larger than the image itself
    formats: ['avif', 'webp'],
    quality: { avif: 50, webp: 75, jpeg: 80 }, // PNG stays lossless unless png is set
    sizes: '100vw',
  },
},
```

A Markdown image such as `![Harbour at dawn](/images/hero.jpg)` is written as:

```html
<picture>
  <source type="image/avif" srcset="/_img/hero-3f9a2c1b-480.avif 480w, …" sizes="100vw">
  <source type="image/webp" srcset="/_img/hero-3f9a2c1b-480.webp 480w, …" sizes="100vw">
  <img src="/_img/hero-3f9a2c1b-1440.jpg" srcset="…" sizes="100vw" alt="Harbour at dawn"
       width="1600" height="900" loading="lazy" decoding="async">
</picture>
```

Generated files live under `/_img/` with names that change when the image or the options change, so they can be cached forever. Unchanged images are never encoded twice, and replacing an image rebuilds only the pages that show it.

In templates, use `stati.image()`:

```eta
<%~ stati.image('/images/hero.jpg', { alt: 'Harbour at dawn', sizes: '100vw', priority: true }) %>
```

## Open Graph images

```ts
images: {
  og: {
    width: 1200,
    height: 630,
    format: 'png',
    exclude: ['/drafts/**'],
  },
},
```

Each page gets `og:image`, its size and `twitter:image`, pointing to a card rendered for that page. A page that sets `seo.openGraph.image` in its front matter keeps its own image; `image: false` gives it none. With `@stati/core` 2.2 or later, the site's 404 page gets no card.

### Designing the card

Without a template, pages use the built-in card: the site name, the section, the page title and description, and the page address. To design your own, add `og.eta` to your `site/` folder, or to a section folder such as `site/blog/` to give that section its own card. The nearest one wins. A good starting point is the built-in card, in [`templates/og.eta`](./templates/og.eta).

Card templates receive the same `stati` object as layouts, without the page body, plus `stati.og` with the card's `width` and `height`. They use inline styles in the CSS subset Satori supports: flexbox layout, no grid, no classes or `<style>` blocks. Every element with more than one child needs `display:flex`.

### Fonts

Archivo (800), Inter (400 and 500) and Fira Code (400) are always available, with Latin, Latin-1 and Latin Extended-A characters. Add your own fonts in TTF, OTF or WOFF format; Satori cannot read WOFF2:

```ts
images: {
  og: {
    fonts: [{ name: 'Young Serif', path: './og/fonts/young-serif-regular.woff', weight: 400 }],
  },
},
```

---

## Troubleshooting

**`Could not load sharp for linux-x64`** on a build server usually means the lockfile was created on another operating system and lacks sharp's binary for this one. Run `npm install` again so the lockfile lists every platform's optional `@img/sharp-*` package, or see the [sharp installation guide](https://sharp.pixelplumbing.com/install).

**Builds re-encode every image on the host.** Encoded images are cached in `dist/_img` and `.stati/images`. Keep both between builds (for example with your host's build cache) to skip encoding unchanged images.

---

## License

MIT. The bundled fonts are licensed under the SIL Open Font License; see [`fonts/`](./fonts/).
