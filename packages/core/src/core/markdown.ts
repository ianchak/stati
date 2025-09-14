import MarkdownIt from 'markdown-it';
import type { StatiConfig } from '../types/index.js';

/**
 * Creates and configures a MarkdownIt processor based on the provided configuration.
 * Supports both plugin array format and configure function format.
 */
export async function createMarkdownProcessor(config: StatiConfig): Promise<MarkdownIt> {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  // Apply plugins from array format
  if (config.markdown?.plugins) {
    for (const plugin of config.markdown.plugins) {
      if (typeof plugin === 'string') {
        // Plugin name only
        try {
          const pluginModule = await import(`markdown-it-${plugin}`);
          const pluginFunction = pluginModule.default || pluginModule;
          md.use(pluginFunction);
        } catch (error) {
          console.warn(`Failed to load markdown plugin: markdown-it-${plugin}`, error);
        }
      } else if (Array.isArray(plugin) && plugin.length >= 1) {
        // Plugin name with options [name, options]
        const [pluginName, options] = plugin;
        try {
          const pluginModule = await import(`markdown-it-${pluginName}`);
          const pluginFunction = pluginModule.default || pluginModule;
          md.use(pluginFunction, options);
        } catch (error) {
          console.warn(`Failed to load markdown plugin: markdown-it-${pluginName}`, error);
        }
      }
    }
  }

  // Apply user configuration function (this runs after plugins for override capability)
  if (config.markdown?.configure) {
    config.markdown.configure(md);
  }

  return md;
}

export function renderMarkdown(content: string, md: MarkdownIt): string {
  return md.render(content);
}
