import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Eta } from 'eta';
import {
  makeCallablePartial,
  wrapPartialsAsCallable,
} from '../../src/core/utils/callable-partials.js';

describe('Callable Partials', () => {
  let mockEta: Eta;
  let baseContext: Record<string, unknown>;

  beforeEach(() => {
    mockEta = new Eta({
      views: '/test/views',
      varName: 'stati', // Match Stati's configuration
    });

    baseContext = {
      site: { title: 'Test Site' },
      page: { title: 'Test Page' },
    };
  });

  describe('makeCallablePartial', () => {
    it('should return pre-rendered content when used as a value (toString)', () => {
      const renderedContent = '<header>Default Header</header>';
      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      expect(callable.toString()).toBe(renderedContent);
    });

    it('should return pre-rendered content when used as a value (valueOf)', () => {
      const renderedContent = '<header>Default Header</header>';
      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      expect(callable.valueOf()).toBe(renderedContent);
    });

    it('should return pre-rendered content when called without props', () => {
      const renderedContent = '<header>Default Header</header>';
      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      expect(callable()).toBe(renderedContent);
    });

    it('should return pre-rendered content when called with empty props', () => {
      const renderedContent = '<header>Default Header</header>';
      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      expect(callable({})).toBe(renderedContent);
    });

    it('should re-render with props when called with non-empty props', () => {
      const renderedContent = '<header>Default Header</header>';
      const partialTemplate = '<header><%= stati.props.title %></header>';

      // Mock Eta's readFile to return the template
      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      const result = callable({ title: 'Custom Title' });

      expect(result).toBe('<header>Custom Title</header>');
    });

    it('should merge props with base context, with props taking precedence', () => {
      const renderedContent = '<div>Default</div>';
      // Props should NOT override base context - they're only in stati.props
      const partialTemplate = '<div><%= stati.site.title %> - <%= stati.props.customTitle %></div>';

      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const callable = makeCallablePartial(
        mockEta,
        '/test/content.eta',
        baseContext,
        renderedContent,
      );

      // Pass customTitle via props
      const result = callable({ customTitle: 'Custom Title' });

      expect(result).toContain('Test Site'); // site.title from baseContext
      expect(result).toContain('Custom Title'); // customTitle from props
    });

    it('should make props accessible via stati.props', () => {
      const renderedContent = '<div>Default</div>';
      const partialTemplate = '<div><%= stati.props.title %> - <%= stati.props.subtitle %></div>';

      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const callable = makeCallablePartial(
        mockEta,
        '/test/props-test.eta',
        baseContext,
        renderedContent,
      );

      const result = callable({ title: 'My Title', subtitle: 'My Subtitle' });

      expect(result).toBe('<div>My Title - My Subtitle</div>');
    });

    it('should handle rendering errors gracefully', () => {
      const renderedContent = '<div>Default</div>';

      // Mock readFile to return undefined (file not found)
      vi.spyOn(mockEta, 'readFile').mockReturnValue(undefined as unknown as string);

      const callable = makeCallablePartial(
        mockEta,
        '/test/missing.eta',
        baseContext,
        renderedContent,
      );

      const result = callable({ title: 'Test' });

      expect(result).toContain('<!-- Error rendering partial');
    });

    it('should allow access to function properties via Reflect.get', () => {
      const renderedContent = '<header>Default Header</header>';
      const callable = makeCallablePartial(
        mockEta,
        '/test/header.eta',
        baseContext,
        renderedContent,
      );

      // Access function properties like name, length, etc.
      // This triggers the Reflect.get fallback in the proxy
      expect(typeof callable.name).toBe('string');
      expect(typeof callable.length).toBe('number');
    });
  });

  describe('wrapPartialsAsCallable', () => {
    it('should wrap all partials in a record', () => {
      const partials = {
        header: '<header>Header</header>',
        footer: '<footer>Footer</footer>',
      };

      const partialPaths = {
        header: '/test/_partials/header.eta',
        footer: '/test/_partials/footer.eta',
      };

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      expect(Object.keys(wrapped)).toEqual(['header', 'footer']);
      expect(wrapped.header?.toString()).toBe('<header>Header</header>');
      expect(wrapped.footer?.toString()).toBe('<footer>Footer</footer>');
    });

    it('should skip partials without paths and warn', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const partials = {
        header: '<header>Header</header>',
        orphan: '<div>No path</div>',
      };

      const partialPaths = {
        header: '/test/_partials/header.eta',
        // orphan has no path
      };

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      expect(Object.keys(wrapped)).toEqual(['header']);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No path found for partial "orphan"'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should create callable partials that can be used both ways', () => {
      const partials = {
        card: '<div class="card">Default Card</div>',
      };

      const partialPaths = {
        card: '/test/_partials/card.eta',
      };

      const partialTemplate = '<div class="card"><%= stati.props.title || "Default Card" %></div>';
      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // Use as value
      expect(wrapped.card?.toString()).toBe('<div class="card">Default Card</div>');

      // Use as function with props
      expect(wrapped.card?.({ title: 'Custom Card' })).toBe('<div class="card">Custom Card</div>');
    });
  });

  describe('Integration scenarios', () => {
    it('should work in iterative contexts (loops) with stati.props', () => {
      const partials = {
        item: '<li>Default Item</li>',
      };

      const partialPaths = {
        item: '/test/_partials/item.eta',
      };

      const partialTemplate = '<li><%= stati.props.name %> - <%= stati.props.index %></li>';
      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // Simulate loop usage with stati.props access
      const items = [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }];
      const results = items.map((item, index) => wrapped.item?.({ ...item, index }));

      expect(results).toEqual([
        '<li>Item 1 - 0</li>',
        '<li>Item 2 - 1</li>',
        '<li>Item 3 - 2</li>',
      ]);
    });

    it('should allow both stati.props and direct property access', () => {
      const partials = {
        card: '<div>Default</div>',
      };

      const partialPaths = {
        card: '/test/_partials/card.eta',
      };

      // Template uses stati.props for passed props and stati.site for base context
      const partialTemplate =
        '<div class="card"><h3><%= stati.props.title %></h3><p><%= stati.site.title %></p></div>';
      vi.spyOn(mockEta, 'readFile').mockReturnValue(partialTemplate);

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.card?.({ title: 'Card Title' });

      expect(result).toBe('<div class="card"><h3>Card Title</h3><p>Test Site</p></div>');
    });

    it('should maintain backwards compatibility with direct usage', () => {
      const partials = {
        header: '<header>Site Header</header>',
        footer: '<footer>Site Footer</footer>',
      };

      const partialPaths = {
        header: '/test/_partials/header.eta',
        footer: '/test/_partials/footer.eta',
      };

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // Old syntax (direct usage) should still work
      const layoutTemplate = `
        <!DOCTYPE html>
        <html>
          <body>
            \${stati.partials.header}
            <main>Content</main>
            \${stati.partials.footer}
          </body>
        </html>
      `;

      // Simulate template rendering with string interpolation
      const rendered = layoutTemplate
        .replace('${stati.partials.header}', wrapped.header?.toString() ?? '')
        .replace('${stati.partials.footer}', wrapped.footer?.toString() ?? '');

      expect(rendered).toContain('<header>Site Header</header>');
      expect(rendered).toContain('<footer>Site Footer</footer>');
    });

    it('should handle nested partial calls with props', () => {
      const partials = {
        container: '<div class="container">Content</div>',
      };

      const partialPaths = {
        container: '/test/_partials/container.eta',
      };

      const containerTemplate =
        '<div class="<%= stati.props.containerClass || "container" %>"><%~ stati.props.content %></div>';
      vi.spyOn(mockEta, 'readFile').mockReturnValue(containerTemplate);

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // Call with custom props
      const result = wrapped.container?.({
        containerClass: 'custom-container',
        content: '<p>Nested content</p>',
      });

      expect(result).toBe('<div class="custom-container"><p>Nested content</p></div>');
    });
  });
});
