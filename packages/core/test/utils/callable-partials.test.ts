import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Eta } from 'eta';
import {
  makeCallablePartial,
  wrapPartialsAsCallable,
} from '../../src/core/utils/callable-partials.utils.js';

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

  describe('Nested callable partials', () => {
    it('should allow a callable partial to call another callable partial', () => {
      // Set up two partials: 'icon' and 'button' where button uses icon
      const partials = {
        icon: '<svg class="icon">default</svg>',
        button: '<button>Default Button</button>',
      };

      const partialPaths = {
        icon: '/test/_partials/icon.eta',
        button: '/test/_partials/button.eta',
      };

      // Icon template renders based on props
      const iconTemplate =
        '<svg class="icon <%= stati.props.size || "md" %>"><%= stati.props.name %></svg>';

      // Button template calls the icon partial
      const buttonTemplate =
        '<%~ stati.partials.icon({ name: stati.props.iconName, size: "sm" }) %><span><%= stati.props.label %></span>';

      // Mock readFile to return different templates based on path
      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('icon')) return iconTemplate;
        if (path.includes('button')) return buttonTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // Call button with props - it should internally call icon
      const result = wrapped.button?.({ iconName: 'star', label: 'Click Me' });

      expect(result).toContain('<svg class="icon sm">star</svg>');
      expect(result).toContain('<span>Click Me</span>');
    });

    it('should provide dynamic access to callable partials via getter', () => {
      const partials = {
        wrapper: '<div>wrapper</div>',
        inner: '<span>inner</span>',
      };

      const partialPaths = {
        wrapper: '/test/_partials/wrapper.eta',
        inner: '/test/_partials/inner.eta',
      };

      // Wrapper calls inner partial
      const wrapperTemplate =
        '<div class="wrapper"><%~ stati.partials.inner({ text: stati.props.innerText }) %></div>';
      const innerTemplate = '<span class="inner"><%= stati.props.text %></span>';

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('wrapper')) return wrapperTemplate;
        if (path.includes('inner')) return innerTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.wrapper?.({ innerText: 'Hello World' });

      expect(result).toBe('<div class="wrapper"><span class="inner">Hello World</span></div>');
    });

    it('should handle three levels of nested callable partials', () => {
      const partials = {
        card: '<div class="card">card</div>',
        cardHeader: '<header>header</header>',
        icon: '<svg>icon</svg>',
      };

      const partialPaths = {
        card: '/test/_partials/card.eta',
        cardHeader: '/test/_partials/cardHeader.eta',
        icon: '/test/_partials/icon.eta',
      };

      // Card -> CardHeader -> Icon (three levels deep)
      const cardTemplate =
        '<div class="card"><%~ stati.partials.cardHeader({ title: stati.props.title, showIcon: stati.props.showIcon }) %></div>';
      const cardHeaderTemplate =
        '<header><% if (stati.props.showIcon) { %><%~ stati.partials.icon({ name: "check" }) %><% } %><%= stati.props.title %></header>';
      const iconTemplate = '<svg class="icon-<%= stati.props.name %>"></svg>';

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('cardHeader')) return cardHeaderTemplate;
        if (path.includes('card')) return cardTemplate;
        if (path.includes('icon')) return iconTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.card?.({ title: 'My Card', showIcon: true });

      expect(result).toContain('<div class="card">');
      expect(result).toContain('<header>');
      expect(result).toContain('<svg class="icon-check"></svg>');
      expect(result).toContain('My Card');
      expect(result).toContain('</header>');
      expect(result).toContain('</div>');
    });

    it('should handle nested callable with conditional rendering', () => {
      const partials = {
        alert: '<div class="alert">alert</div>',
        icon: '<svg>icon</svg>',
      };

      const partialPaths = {
        alert: '/test/_partials/alert.eta',
        icon: '/test/_partials/icon.eta',
      };

      // Alert conditionally includes icon
      const alertTemplate = `<div class="alert alert-<%= stati.props.type || 'info' %>">
<% if (stati.props.showIcon !== false) { %><%~ stati.partials.icon({ name: stati.props.type || 'info' }) %><% } %>
<span><%= stati.props.message %></span>
</div>`;
      const iconTemplate = '<svg class="icon-<%= stati.props.name %>"></svg>';

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('alert')) return alertTemplate;
        if (path.includes('icon')) return iconTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      // With icon
      const withIcon = wrapped.alert?.({ type: 'success', message: 'Done!' });
      expect(withIcon).toContain('<svg class="icon-success"></svg>');
      expect(withIcon).toContain('<span>Done!</span>');

      // Without icon
      const withoutIcon = wrapped.alert?.({ type: 'error', message: 'Failed!', showIcon: false });
      expect(withoutIcon).not.toContain('<svg');
      expect(withoutIcon).toContain('<span>Failed!</span>');
    });

    it('should allow a partial to call multiple other partials', () => {
      const partials = {
        section: '<section>section</section>',
        heading: '<h2>heading</h2>',
        button: '<button>button</button>',
      };

      const partialPaths = {
        section: '/test/_partials/section.eta',
        heading: '/test/_partials/heading.eta',
        button: '/test/_partials/button.eta',
      };

      // Section uses both heading and button
      const sectionTemplate = `<section>
<%~ stati.partials.heading({ text: stati.props.title }) %>
<p><%= stati.props.content %></p>
<%~ stati.partials.button({ label: stati.props.buttonText }) %>
</section>`;
      const headingTemplate = '<h2><%= stati.props.text %></h2>';
      const buttonTemplate = '<button class="btn"><%= stati.props.label %></button>';

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('section')) return sectionTemplate;
        if (path.includes('heading')) return headingTemplate;
        if (path.includes('button')) return buttonTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.section?.({
        title: 'Features',
        content: 'Here are some features',
        buttonText: 'Learn More',
      });

      expect(result).toContain('<h2>Features</h2>');
      expect(result).toContain('<p>Here are some features</p>');
      expect(result).toContain('<button class="btn">Learn More</button>');
    });

    it('should maintain separate props contexts for nested calls', () => {
      const partials = {
        outer: '<div>outer</div>',
        inner: '<span>inner</span>',
      };

      const partialPaths = {
        outer: '/test/_partials/outer.eta',
        inner: '/test/_partials/inner.eta',
      };

      // Outer passes different props to inner than what it received
      const outerTemplate =
        '<div data-outer="<%= stati.props.outerValue %>"><%~ stati.partials.inner({ innerValue: "inner-specific" }) %></div>';
      const innerTemplate =
        '<span data-inner="<%= stati.props.innerValue %>" data-outer="<%= stati.props.outerValue || "undefined" %>"></span>';

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('outer')) return outerTemplate;
        if (path.includes('inner')) return innerTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.outer?.({ outerValue: 'outer-specific' });

      // Outer should have its props
      expect(result).toContain('data-outer="outer-specific"');
      // Inner should have its own props, not outer's props
      expect(result).toContain('data-inner="inner-specific"');
      // Inner should NOT have access to outer's props
      expect(result).toContain('data-outer="undefined"');
    });

    it('should handle error gracefully when nested partial fails', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const partials = {
        parent: '<div>parent</div>',
        child: '<span>child</span>',
      };

      const partialPaths = {
        parent: '/test/_partials/parent.eta',
        child: '/test/_partials/child.eta',
      };

      // Parent calls child, but child template has an error
      const parentTemplate = '<div><%~ stati.partials.child({ value: stati.props.value }) %></div>';
      const childTemplate = '<span><%= stati.props.nonExistent.deep.property %></span>'; // This will throw

      vi.spyOn(mockEta, 'readFile').mockImplementation((path: string) => {
        if (path.includes('parent')) return parentTemplate;
        if (path.includes('child')) return childTemplate;
        return '';
      });

      const wrapped = wrapPartialsAsCallable(mockEta, partials, partialPaths, baseContext);

      const result = wrapped.parent?.({ value: 'test' });

      // Should contain error comment instead of crashing
      expect(result).toContain('<!-- Error rendering partial');

      consoleErrorSpy.mockRestore();
    });
  });
});
