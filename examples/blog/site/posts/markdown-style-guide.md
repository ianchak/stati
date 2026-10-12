---
title: The Markdown style guide
description: Every Markdown element this blog styles, in one place, so you can see how your posts will look.
publishedAt: '2025-12-02'
tags: ['writing', 'reference']
---

This post uses every element the stylesheet covers. Keep it while you change the design: if this page looks right, your posts will too. Like every first paragraph of a post, this one opens with a drop cap.

## Headings

Use `##` for sections and `###` for parts of a section. The post title is already the page's main heading.

### A smaller heading

Smaller headings group a few paragraphs without breaking the flow of a long section.

#### The smallest heading

Use it sparingly, for a label above a list or a table.

## Text

Paragraphs are separated by a blank line. Inside them you can use **bold** for words that must not be missed, _italics_ for titles and emphasis, `inline code` for anything typed, and [links](/archive) to other pages or other sites. Markdown also turns "straight quotes" into curly ones, and two hyphens into a dash -- like this.

> A blockquote sets off someone else's words. Use it for quotations, not for decoration, and say who said it in the paragraph around it.

## Lists

- Unordered lists suit items in no particular order.
- Keep items short and parallel.
  - Nested items are indented by two spaces.
- End without a full stop when items are fragments.

1. Ordered lists suit steps.
2. Each step starts with what to do.
3. The numbers are set in tabular figures, so they line up.

---

The leaf above is a section break, written as three hyphens on their own line.

## Code

```js
// stati.config.js
export default defineConfig({
  site: {
    title: 'Stati Blog',
    baseUrl: 'https://example.com',
  },
});
```

Long lines scroll sideways instead of breaking the column:

```bash
npx create-stati my-blog --template blog --styling css --no-typescript --package-manager npm
```

## Tables

| Element     | Markdown       | Use it for                    |
| ----------- | -------------- | ----------------------------- |
| Bold        | `**words**`    | Words that must not be missed |
| Italic      | `*words*`      | Titles and emphasis           |
| Inline code | `` `code` ``   | Commands, file names, values  |
| Link        | `[text](/url)` | Other pages and sites         |

## Images

Images span the column. Store them in `public/images/` and always describe them in the alt text. Wrap an image in a `<figure>` to give it a caption:

<figure>
  <img src="/images/social-card.png" alt="The blog name in large serif letters above the address and the leaf ornament" width="1200" height="630" loading="lazy" />
  <figcaption>The default link preview card, public/images/social-card.png. Replace it with your own.</figcaption>
</figure>

That is everything. If this page reads well, so will your posts.
