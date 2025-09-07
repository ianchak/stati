import MarkdownIt from 'markdown-it';
import type { StatiConfig } from '../types.js';

export function createMarkdownProcessor(config: StatiConfig): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Apply user configuration
  if (config.markdown?.configure) {
    config.markdown.configure(md);
  }

  return md;
}

export function renderMarkdown(content: string, md: MarkdownIt): string {
  return md.render(content);
}
