---
name: Stati Documentation
description: The product page and reference for Stati, a TypeScript-first static site generator, built with Stati itself.
colors:
  canvas: "#ffffff"
  raised: "#f8fafc"
  sunken: "#f6f8fa"
  ink: "#0b0d12"
  muted: "#475569"
  faint: "#5b6577"
  line: "#e2e8f0"
  line-strong: "#cbd5e1"
  accent: "#2563eb"
  accent-ink: "#1d4ed8"
  on-accent: "#ffffff"
  accent-wash: "#eef4ff"
  canvas-dark: "#020617"
  raised-dark: "#0f172a"
  sunken-dark: "#0b1220"
  ink-dark: "#f1f5f9"
  muted-dark: "#94a3b8"
  faint-dark: "#8391a7"
  line-dark: "#1e293b"
  line-strong-dark: "#334155"
  accent-dark: "#60a5fa"
  accent-ink-dark: "#93c5fd"
  on-accent-dark: "#020617"
  accent-wash-dark: "#0f1e3d"
typography:
  display:
    fontFamily: "Archivo, Archivo Fallback, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 1.2rem + 4.1vw, 4.6rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "font-stretch: 116%"
  headline:
    fontFamily: "Archivo, Archivo Fallback, Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: "font-stretch: 115%"
  headline-docs:
    fontFamily: "Archivo, Archivo Fallback, Inter, system-ui, sans-serif"
    fontSize: "2.25rem (2.75rem from 1024px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontVariation: "font-stretch: 108%"
  title:
    fontFamily: "Archivo, Archivo Fallback, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontVariation: "font-stretch: 110%"
  lede:
    fontFamily: "Inter, Inter Fallback, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 2
  body:
    fontFamily: "Inter, Inter Fallback, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    fontFeature: "'kern' 1, 'liga' 1, 'calt' 1, 'cv11' 1"
  label:
    fontFamily: "Inter, Inter Fallback, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  code:
    fontFamily: "Fira Code, Fira Code Fallback, Consolas, Monaco, monospace"
    fontSize: "13px (14px from 640px)"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "font-variant-ligatures: none"
  data:
    fontFamily: "Fira Code, Fira Code Fallback, Consolas, Monaco, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  header: "4rem"
  page: "80rem"
  shell: "96rem"
  prose: "72ch"
  measure: "37rem"
  section: "5rem (7rem from 1024px)"
  gutter: "1rem (1.5rem from 640px)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-ink}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  command-line:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 8px 8px 16px"
  code-panel:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-current:
    textColor: "{colors.ink}"
  sidebar-link:
    textColor: "{colors.muted}"
    padding: "6px 8px 6px 16px"
  sidebar-link-current:
    textColor: "{colors.accent-ink}"
  search-trigger:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "36px (44px below 640px)"
    width: "224px"
  search-dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    width: "min(40rem, calc(100vw - 2rem))"
  inline-code:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  callout:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    padding: "16px 20px"
---

# Design System: Stati Documentation

## Overview

**Creative North Star: "The Product Is the Design"**

The site follows the developer-tool category convention (the astro.build, vite.dev, bun.sh tradition) and wins on precision rather than conceit. There is no metaphor layered over the product: real code panels, the working install command and the complete feature inventory carry the visual weight. White and ink in light mode, slate-950 in dark, slate neutrals between, and one blue that only ever means "you can act here" or "you are here."

Structure is drawn, not lifted. One-pixel hairlines divide header, sections, inventory rows, sidebar and code frames; nothing casts a decorative shadow. Precision details are few and deliberate: fine corner ticks registering the install command and the code-panel stacks, and a faint 48px engineered grid behind the homepage hero only. Display type is Archivo, heavy and slightly expanded; everything you read is Inter; Fira Code is reserved for code and measured data.

Motion is a single orchestrated entrance, not an ambient layer. Both themes are first-class and every token pairing holds WCAG AA.

**Key Characteristics:**
- One accent, used for actions, links, focus and current location only.
- 1px hairline structure; flat surfaces; tonal steps (canvas, raised, sunken) instead of shadows.
- Code highlighted at build time is the imagery.
- Heavy expanded Archivo display against quiet Inter prose.
- Native platform controls: `<details>` sidebar sections, `<dialog>` search.
- One load reveal; everything still under reduced motion.

## Colors

A neutral slate system with a single Stati blue; every color is a theme token defined as RGB channels on `:root` (light) and `html.dark` (dark), so one semantic class is correct in both themes.

### Primary
- **Stati Blue** (accent; dark: accent-dark): the primary button fill, focus ring (2px outline, 2px offset), the current header nav underline (2px inset bar), the current sidebar rule, the brand mark, and text selection at 25% alpha.
- **Deep Stati Blue** (accent-ink; dark: accent-ink-dark): accent as text. Prose links, inline "Read more" links, current sidebar and TOC entries, the copied state, hover on inventory rows, and the primary button hover fill. Prose links underline at 40% accent, full accent on hover.
- **Blue Wash** (accent-wash; dark: accent-wash-dark): the selected search result row and search match highlights only.
- **On Blue** (on-accent): text on the accent fill.

### Neutral
- **Canvas** (canvas): page background, painted on `<html>` so there is no flash between pages; also header, sidebar, dialog.
- **Raised** (raised): hover fills for ghost controls, the search trigger, the command line, callouts, and the dogfood band.
- **Sunken** (sunken): code panels, prose `<pre>`, inline code chips.
- **Ink** (ink): headings, primary text, the inventory group rule. At 30-40% alpha it is the drawer and dialog scrim.
- **Slate Muted** (muted): body prose, ledes, secondary navigation text.
- **Slate Faint** (faint): metadata, code-panel filenames, spec line, counters, list markers, corner ticks (at 70%).
- **Hairline** (line): every structural rule and panel border.
- **Strong Hairline** (line-strong): secondary-button border, command-line border, hover borders, scrollbar thumb.

### Syntax palette
Code tokens use a restrained multi-hue set tuned for the sunken surface, each at least 5:1 in both themes: keywords magenta (#a3165f / #f472b6), strings green (#11753d / #7dd3a0), numbers amber (#92400e / #fdba74), functions and tags blue (#1d4ed8 / #93c5fd), properties violet (#6d28d9 / #c4b5fd), comments italic slate (#5c6b80 / #8b98ad), punctuation gray (#4b5563 / #a7b1c2). Highlighted lines take an 8-10% accent tint.

### Named Rules
**The One Blue Rule.** The accent marks only actions, links, focus and the current location. Never use it for decoration, section hues, icon tints or emphasis.

**The Token Pair Rule.** Use semantic tokens, never raw hex or `dark:` color overrides; every surface must read correctly by swapping `html.dark` alone.

## Typography

**Display Font:** Archivo variable (with metric-matched Arial fallback), used expanded (font-stretch 108-118%) at weight 700-800
**Body Font:** Inter (with metric-matched Arial fallback, then system-ui)
**Label/Mono Font:** Fira Code (with metric-matched Courier New fallback), ligatures off

**Character:** A heavy, wide grotesk for headlines gives the site an engineered stance; Inter keeps UI and long reading neutral. All three faces are self-hosted.

### Hierarchy
- **Display** (800, clamp(2.4rem → 4.6rem), 1.02, stretch 116%): the homepage H1 only.
- **Headline** (800, clamp(2rem → 3rem), 1.05, stretch 115%): homepage section headings. Docs page H1 (2.25rem, 2.75rem on desktop, 1.1) and H2 (1.5rem, ruled above with a hairline) use the same face at stretch 108%.
- **Title** (700, 1.5rem, stretch 110%): claim headings on the homepage. Docs H3/H4 drop to Inter semibold (1.125rem / 1rem).
- **Body** (400, 16px, 28px leading): prose in muted. Running text (paragraphs and lists) is capped at 37rem, about 75 characters of Inter; code, tables, callouts and images use the full 72ch column. Ledes run 18px on 32px.
- **Label** (600, 14px): buttons (including the hero Copy), inventory group heads, footer column heads.
- **Small UI** (13px): sidebar section toggles, the "On this page" label (600, ink, sentence case) and TOC links, and search result snippets.
- **Code** (Fira Code 400, 13px / 14px from 640px, 1.65): code panels and prose blocks.
- **Data** (Fira Code 400, 12px): measured facts such as the hero spec line, the feature count, filename bars, the rebuild log.

### Named Rules
**The Mono Means Measured Rule.** Monospace is for code, commands, filenames and countable facts. Never set prose, headings or decorative labels in mono.

**The Display Is Expanded Rule.** Archivo always appears with font-stretch above 100% and weight 700+; it is a headline face, never body text.

## Layout

A sticky 4rem header over a centered page. Marketing sections sit in an 80rem container; the docs shell widens to 96rem with a 16rem sticky sidebar (from 1024px), a 72ch prose column whose running text holds a 37rem measure, and a 15rem sticky "On this page" TOC (from 1280px). Gutters are 1rem, 1.5rem from 640px; docs content pads to 3rem on desktop.

Homepage sections stack full-bleed, separated by hairlines, with 5rem vertical padding (7rem on desktop; the closing call to action uses 6-8rem). Two-column compositions use asymmetric fractional grids (0.9fr/1.1fr in the hero, 5fr/7fr in the claims and dogfood rows) and collapse to one column below 1024px; claim text columns stick at 6rem while panels scroll. The feature inventory is a typographic index of 1, 2, then 4 columns (640px, 1280px) rather than cards. Anchors clear the header with 5.5rem scroll padding.

Below 1024px the sidebar becomes an off-canvas drawer (min(20rem, 85vw)) over an ink scrim, and the homepage gets a compact nav panel under the header.

## Elevation & Depth

The system is flat. No element casts a box-shadow; depth comes from three tonal steps (sunken below canvas, raised above it) and 1px hairlines. The only "shadow" in the code is the 2px inset bar that underlines the current header nav item, which is a rule, not elevation. Overlays (search dialog, mobile drawer) separate from the page by a translucent ink scrim and a strong-hairline border, not by shadow.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px lines in line or line-strong. If a surface needs separation, change its tone or add a rule; never add a shadow, glow or blur.

## Shapes

Gently rounded and consistent. Buttons, the command line, code panels, prose code blocks, callouts, images and pager cards share an 8px radius (lg). Small ghost controls (nav items, icon buttons, copy buttons, the search trigger) use 6px (md). Inline code chips and the focus ring use 4px (sm). The search dialog alone takes 12px (xl) on screens 640px and wider; on phones it is full-screen and square. Status dots in the rebuild log are the only circles.

**Corner ticks** are the one geometric signature: 9px-by-1px registration marks drawn just outside a frame's four corners (6px out), in faint at 70%. They mark the install command and wrap each claim's code-panel stack; a panel inside a ticked stack omits its own. Do not spread them to cards, images or prose.

## Components

### Buttons
Compact, flat and confident.
- **Shape:** gently rounded (8px).
- **Primary:** accent fill, on-accent text, 14px semibold, 10px 16px padding; hover deepens to accent-ink. Used for the Copy action in the command line; one per view.
- **Secondary:** canvas fill, 1px line-strong border, ink text; hover darkens the border to ink.
- **Ghost / text:** muted text that turns ink on hover (GitHub link, icon buttons with a raised hover fill). Header icon buttons are 44px touch targets below 1024px and 36px above.
- **Focus:** the global 2px accent outline at 2px offset, keyboard focus only. Colors transition in 150ms.

### Command Line
The install command is the hero's primary action: a raised strip with a strong hairline, a faint `$` prompt, the command in 15px mono, and a compact primary Copy button, wrapped in corner ticks. Copy confirms with a "Copied" label in accent-ink, announced to screen readers.

The closing start section uses a **command list**: one ticked code-panel frame holding the three commands from nothing to a running site (`npx create-stati my-site`, `cd my-site`, `npm run dev`), one per hairline-divided row, each with its own ghost Copy button. They are copied separately because pasting them together would feed the later lines into the scaffolder's prompts.

### Code Panel (signature)
A `<figure>` framed in a hairline on sunken, with a filename bar (12px mono, faint) and a ghost Copy button separated by a hairline. Code is highlighted at build time by the `highlight` Eta filter, so no highlighter ships to the browser. In prose, code blocks use the same surface, radius and palette, with a Copy button that appears on hover or focus (always visible on touch).

### Rebuild Log
A code-panel-framed table showing pages as rebuilt (solid ink square) or cached (faint hollow circle), with mono paths and Inter reasons. Rows settle in order when scrolled into view; the summary sits in the bar.

### Callouts / Cards
- **Callout:** blockquotes become Note/Tip boxes: raised fill, hairline border, 8px radius, 16px 20px padding, upright muted text with ink strong.
- **Pager cards:** hairline-bordered 8px tiles, faint "Previous/Next" label over an ink title that turns accent-ink on hover; the border steps to line-strong.
- **Inventory rows:** not cards. Each feature is a row under a hairline with an ink name and muted description; a 1px ink rule heads each group, and the trailing arrow brightens and nudges 2px on hover.

### Inputs / Fields
- **Search trigger:** a 36px raised field with a hairline, muted "Search docs", and a `/` key cap; hover strengthens the border. Collapses to an icon on phones.
- **Search input:** borderless 56px row inside the dialog, ruled below with a hairline; placeholder in faint.

### Navigation
- **Header:** canvas with a bottom hairline; Archivo wordmark beside the blue mark; nav items 14px medium muted, ink on hover, and the current section carries ink text plus a 2px accent underline.
- **Sidebar:** native `<details>` sections (open for the current section, chevron rotates 90 degrees). Links hang on a 1px left rule; the current page takes an accent rule and accent-ink medium text.
- **TOC:** 13px links on a left hairline; the active heading turns accent-ink with an accent rule.
- **Search dialog:** a native `<dialog>` reachable from the header or `/`, with an ink scrim, popular pages when idle, keyboard hints in the footer, and accent-wash for the selected result.

## Do's and Don'ts

### Do:
- **Do** reserve accent for actions, links, focus and the current location (The One Blue Rule).
- **Do** draw structure with 1px line / line-strong hairlines and tonal surface steps.
- **Do** show the product: real code panels highlighted at build time with the `highlight` filter, real commands, real counts.
- **Do** set display headings in Archivo at weight 700-800 with font-stretch 108-118%.
- **Do** keep the motion vocabulary to the hero load reveal (focus-in with a 6px blur, 0.9s, cubic-bezier(0.16, 1, 0.3, 1), staggered 80-280ms, with the hero code panel clipping open over 1.1s), rebuild-log rows settling in order, the 180ms dialog-in, and the 150ms page cross-fade, all disabled under prefers-reduced-motion.
- **Do** use native `<details>` and `<dialog>` before scripting a disclosure or modal.
- **Do** verify every new pairing in both themes against WCAG AA.

### Don't:
- **Don't** add box-shadows, glows, glass, blurred orbs or gradient text.
- **Don't** put the engineered grid anywhere but behind the homepage hero.
- **Don't** set prose, headings or UI labels in monospace.
- **Don't** introduce a second accent or per-section hues.
- **Don't** present feature lists as same-size icon cards; use hairline-ruled typographic rows.
- **Don't** add small uppercase eyebrow labels above headings.
