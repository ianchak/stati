/**
 * The markdown-it `image` rule that adds dimensions, lazy loading and responsive variants.
 * @module images/markdown-rule
 */

import type { MarkdownIt, Token } from 'markdown-it';
import type { PageImages } from './runtime.js';

/** Key of the page's image state in the markdown-it `env`. */
export const IMAGES_ENV_KEY = 'statiImages';

/** An image counts as near the top of a page when it sits in one of the first blocks. */
const EAGER_BLOCK_LIMIT = 3;

type ImageRule = NonNullable<MarkdownIt['renderer']['rules']['image']>;

/**
 * Installs the image rule. It holds no per-page state: each render passes its page's image
 * state in `env`, and renders without it fall through to the previous rule. Installed before
 * plugins and `markdown.configure`, so a custom image rule there replaces it.
 *
 * @param md - The markdown-it instance
 */
export function installImageRule(md: MarkdownIt): void {
  const previous: ImageRule =
    md.renderer.rules.image ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const images = (env as Record<string, unknown> | undefined)?.[IMAGES_ENV_KEY] as
      PageImages | undefined;
    const token = tokens[idx];
    if (!images || !token) {
      return previous(tokens, idx, options, env, self);
    }

    const alt = self.renderInlineAsText(token.children ?? [], options, env);
    const result = images.renderMarkdownImage(token, alt);
    if ('html' in result) {
      return result.html;
    }
    // Left as authored, apart from a stripped `?raw` suffix
    if (result.src !== token.attrGet('src')) {
      token.attrSet('src', result.src);
    }
    return previous(tokens, idx, options, env, self);
  };
}

/**
 * Picks the image `eagerFirst` loads eagerly: the document's first image, when it sits in
 * one of the first top-level blocks. A first image further down is not the page's largest
 * contentful paint, so it stays lazy.
 *
 * @param tokens - Parsed block tokens
 * @returns The image token, or undefined
 */
export function selectEagerImage(tokens: Token[]): Token | undefined {
  let blocks = 0;
  for (const token of tokens) {
    if (token.level === 0 && token.nesting !== -1) {
      blocks++;
      if (blocks > EAGER_BLOCK_LIMIT) return undefined;
    }
    if (token.type === 'inline') {
      const image = token.children?.find((child) => child.type === 'image');
      if (image) return image;
    }
  }
  return undefined;
}
