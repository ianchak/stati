/**
 * Image pipeline type definitions.
 *
 * Stati adds intrinsic dimensions, lazy loading and co-located image output to every
 * site without configuration. The `responsive` and `og` features below need the
 * optional `@stati/images` package, which implements {@link ImageProvider}.
 */

/** Modern formats that responsive images can add as `<source>` elements. */
export type ImageVariantFormat = 'avif' | 'webp';

/** Every format an image provider can be asked to write. */
export type ImageOutputFormat = 'avif' | 'webp' | 'jpeg' | 'png';

/** Formats Stati can read intrinsic dimensions from. */
export type ImageSourceFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'avif';

/**
 * Encoder quality per output format (1-100).
 * PNG is lossless unless `png` is set, which switches it to palette quantization.
 */
export interface ImagesQualityConfig {
  avif?: number;
  webp?: number;
  jpeg?: number;
  png?: number;
}

/**
 * Responsive image options. Requires `@stati/images`.
 *
 * @example
 * ```typescript
 * images: {
 *   responsive: { widths: [480, 960, 1440], formats: ['avif', 'webp'] },
 * }
 * ```
 */
export interface ResponsiveImagesConfig {
  /** Candidate widths in pixels. Widths above an image's own width are skipped (default: [480, 960, 1440]) */
  widths?: number[];
  /** Modern formats added as `<source>` elements (default: ['avif', 'webp']) */
  formats?: ImageVariantFormat[];
  /** Encoder quality per format (default: avif 50, webp 75, jpeg 80, png lossless) */
  quality?: ImagesQualityConfig;
  /** Default `sizes` attribute (default: '100vw') */
  sizes?: string;
}

/**
 * A font made available to Open Graph image templates.
 * Satori reads TTF, OTF and WOFF files; WOFF2 is not supported.
 */
export interface OgImageFontConfig {
  /** Family name used in `font-family` inside the template */
  name: string;
  /** Path to the font file, relative to the project root */
  path: string;
  /** Font weight (default: 400) */
  weight?: number;
  /** Font style (default: 'normal') */
  style?: 'normal' | 'italic';
}

/**
 * Open Graph image options. Requires `@stati/images`.
 *
 * @example
 * ```typescript
 * images: {
 *   og: { exclude: ['/404'] },
 * }
 * ```
 */
export interface OgImagesConfig {
  /** Template file name looked up from the page's directory up to `srcDir` (default: 'og.eta'). The built-in card is used when none is found. */
  template?: string;
  /** Image width in pixels (default: 1200) */
  width?: number;
  /** Image height in pixels (default: 630) */
  height?: number;
  /** Output format (default: 'png') */
  format?: 'png' | 'jpeg';
  /** Fonts added to the bundled ones (Archivo, Inter, Fira Code) */
  fonts?: OgImageFontConfig[];
  /** URL glob patterns of pages that get no generated image */
  exclude?: string[];
}

/**
 * Image configuration.
 *
 * Stati always adds `width`, `height`, `loading="lazy"` and `decoding="async"` to
 * Markdown images and emits images that sit next to Markdown files. Set `images: false`
 * to turn that off. `responsive` and `og` are independent and each needs `@stati/images`.
 *
 * @example
 * ```typescript
 * images: {
 *   responsive: true,
 *   og: true,
 * }
 * ```
 */
export interface ImagesConfig {
  /** Load the first image near the top of a page eagerly with high fetch priority (default: true) */
  eagerFirst?: boolean;
  /** Generate AVIF/WebP variants with `srcset` and `<picture>`. Requires `@stati/images`. */
  responsive?: boolean | ResponsiveImagesConfig;
  /** Generate an Open Graph image for every page. Requires `@stati/images`. */
  og?: boolean | OgImagesConfig;
  /** `'fast'` (default) skips `responsive` and `og` in the dev server; `'full'` runs them */
  dev?: 'fast' | 'full';
}

/** One file an image provider writes for a source image. */
export interface VariantOutput {
  /** Absolute output path */
  filePath: string;
  /** Output width in pixels; the provider never enlarges the source */
  width: number;
  /** Output format */
  format: ImageOutputFormat;
  /** Encoder quality; omitted for lossless output */
  quality?: number;
}

/** A request to encode one source image into a set of outputs. */
export interface VariantRequest {
  /** Absolute path of the source image */
  sourcePath: string;
  /** One entry per output file; core has already chosen widths, formats and paths */
  outputs: VariantOutput[];
}

/** Font data passed to an Open Graph image renderer. */
export interface OgFont {
  name: string;
  data: Buffer;
  weight?: number;
  style?: 'normal' | 'italic';
}

/** A request to rasterize one Open Graph image from template HTML. */
export interface OgImageRequest {
  /** HTML produced by the Eta template, with local images inlined as data URIs */
  html: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  fonts: OgFont[];
  /** Absolute output path */
  filePath: string;
  /** Template the HTML came from, for error messages */
  templatePath: string;
}

/** The built-in Open Graph card a provider ships. */
export interface OgDefaults {
  /** Eta template source */
  template: string;
  /** Fonts the template uses, always passed to the renderer */
  fonts: OgFont[];
}

/**
 * Contract between `@stati/core` and an image provider such as `@stati/images`.
 * Core decides URLs, widths, formats and caching; the provider only encodes.
 */
export interface ImageProvider {
  /** Contract version; core refuses a provider whose version it does not support */
  readonly apiVersion: 1;
  /** Encoder identity, part of every cache key so encoder upgrades produce new URLs */
  readonly version: string;
  /** Encode one source image into the requested outputs */
  createVariants(request: VariantRequest): Promise<void>;
  /** Rasterize one Open Graph image; required when `images.og` is on */
  renderOgImage?(request: OgImageRequest): Promise<void>;
  /** Load the built-in Open Graph template and its fonts */
  loadOgDefaults?(): Promise<OgDefaults>;
}

/**
 * A generated Open Graph image, as exposed to SEO generation and to templates
 * through `stati.ogImage`.
 */
export interface GeneratedOgImage {
  /** Absolute URL */
  url: string;
  /** Root-relative path */
  path: string;
  width: number;
  height: number;
  /** Alternative text, the page title */
  alt?: string;
}
