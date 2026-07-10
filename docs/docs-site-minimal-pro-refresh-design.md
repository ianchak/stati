# Docs-Site Minimal Pro Refresh Design

## 1. Overview

This document defines the implementation plan for a docs-site focused refresh aimed at experienced JavaScript and TypeScript developers in their 30s and 40s.

Primary intent:

- Preserve the current minimal and fast experience.
- Improve technical readability and scanability for dense documentation.
- Align code highlighting with the docs-site visual language.
- Keep scope limited to docs-site surfaces only.

## 2. Audience Profile

Target audience characteristics:

- Working JS/TS developers with moderate to senior experience.
- Time-constrained readers who scan quickly before deep reading.
- Preference for low-noise interfaces and practical information density.
- High sensitivity to unclear code examples, weak contrast, and decorative UI bloat.

Design implications:

- Favor structure and readability over novelty.
- Keep interactions discoverable and predictable.
- Maintain clean hierarchy in both light and dark themes.
- Ensure syntax colors are distinct and readable across common docs languages.

## 3. Scope

In scope:

- Docs-site visual token and style refinements.
- Docs layout readability polish for sidebar, main content, and TOC.
- Prism syntax highlighting theme redesign to match docs-site identity.
- Docs-site template and section consistency updates where necessary.
- Maintainer-facing documentation for the change.

Out of scope:

- Core generator behavior changes in packages/core.
- CLI behavior changes in packages/cli.
- Scaffolder changes in packages/create-stati.
- Highlighter engine migration away from current prism pipeline.
- Information architecture rewrite or major navigation restructuring.

## 4. Constraints and Guardrails

Technical constraints:

- Keep markdown highlighting pipeline based on markdown-it prism configuration in docs-site config.
- Preserve current docs-site layout architecture and responsive behavior.
- Respect Eta constraints: no partial interpolation inside attribute values.
- Use Stati helper patterns for dynamic class assembly where dynamic classes are needed.

Product constraints:

- Maintain minimal visual tone.
- Avoid adding heavy dependencies for this scope.
- Keep dark mode parity with light mode.
- Avoid regressions in docs build, preview, search, and navigation behavior.

## 5. Current-State Inputs Used

Repository analysis focus areas:

- docs-site template composition and sections.
- docs-site stylesheet and Tailwind customization.
- current prism stylesheet and markdown plugin setup.
- docs-site search, TOC, and navigation surfaces.

External validation source:

- stati.build docs pages for templates, markdown configuration, and troubleshooting guidance.

## 6. Proposed Change Set

### 6.1 Visual System Refinement (Minimal, Not Redesign)

Objectives:

- Improve heading and section scanability.
- Strengthen contrast where needed for sustained reading.
- Keep spacing rhythm calm and consistent.

Planned updates:

- Adjust typography emphasis for major headings and key section transitions.
- Refine neutral backgrounds and border contrast in docs reading surfaces.
- Tighten hover and active affordances in navigation surfaces without visual noise.
- Keep existing accent family and apply restrained updates for readability.

Primary files:

- docs-site/tailwind.config.js
- docs-site/src/styles.css

### 6.2 Docs Layout Readability Polish

Objectives:

- Make long technical pages easier to navigate and scan.
- Increase clarity of current-location and active-section states.

Planned updates:

- Sidebar state and contrast refinement for section headers and active links.
- TOC readability tuning for level depth and active heading identification.
- Main prose rhythm adjustments for paragraphs, lists, links, inline code, and code blocks.
- Keep existing responsive interaction model for mobile sidebar and desktop sticky surfaces.

Primary files:

- docs-site/site/layout.eta
- docs-site/site/\_sections/sidebar.eta
- docs-site/site/\_sections/toc.eta
- docs-site/site/\_sections/header.eta
- docs-site/src/styles.css

### 6.3 Code Highlighting Alignment

Objectives:

- Ensure code samples feel native to docs-site design.
- Improve token differentiation and cross-theme readability.

Planned updates:

- Redesign token palette in prism stylesheet for both light and dark themes.
- Align code block container styles with docs-site cards/prose system.
- Harmonize inline code style with broader typography and contrast needs.
- Validate readability for JS, TS, JSON, Bash, YAML, HTML, and CSS samples.

Primary files:

- docs-site/public/prism-stati.css
- docs-site/src/styles.css
- docs-site/stati.config.ts (verify assumptions only; no pipeline expansion unless necessary)

### 6.4 Template Consistency Touch-Ups

Objectives:

- Keep docs and home surfaces cohesive while prioritizing docs usability.

Planned updates:

- Ensure docs shell styling changes apply consistently where intended.
- Avoid introducing decorative treatment that conflicts with minimal tone.
- Keep preexisting behavior for theme initialization and static asset loading order.

Primary files:

- docs-site/site/layout.eta
- docs-site/site/home.eta
- docs-site/site/\_sections/\*.eta

## 7. File-by-File Implementation Checklist

1. docs-site/tailwind.config.js

- Review and minimally adjust theme extension values used by docs surfaces.
- Preserve existing dark mode strategy and typography plugin usage.

2. docs-site/src/styles.css

- Update prose readability primitives and docs surface styles.
- Refine sidebar and TOC visual states for quick scanning.
- Align inline code and code block wrappers with updated visual language.

3. docs-site/public/prism-stati.css

- Rework syntax token colors and block chrome for light and dark themes.
- Keep language compatibility and token class coverage intact.

4. docs-site/site/layout.eta

- Confirm class usage supports updated docs styles.
- Preserve script/style order and theme initialization placement.

5. docs-site/site/\_sections/sidebar.eta

- Tune classes for active and hover states to improve orientation.

6. docs-site/site/\_sections/toc.eta

- Tune hierarchy and active state readability.

7. docs-site/site/\_sections/header.eta

- Apply restrained readability and affordance polish only if needed.

8. docs-site/site/home.eta

- Ensure visual harmony with updated docs language without overpowering docs pages.

9. docs-site/stati.config.ts

- Validate markdown plugin and prism assumptions remain correct.
- Keep change minimal unless verification reveals a strict blocker.

## 8. Acceptance Criteria

Audience-fit criteria:

- Dense docs pages are easier to scan quickly.
- Code examples are clearer and easier to parse in both themes.
- The site remains minimal and professional, without added visual clutter.

Functional criteria:

- No regression in docs-site build and preview.
- Sidebar, TOC, search, and theme behavior remain stable.
- No breakage in markdown rendering or syntax highlighting coverage.

Quality criteria:

- Strong readable contrast for prose and code tokens in light and dark themes.
- Keyboard focus and active states remain visible.
- No obvious layout shifts introduced by style changes.

## 9. Verification Plan

1. Build and preview validation

- Run local docs-site build and preview commands used by this repository.
- Confirm no template, markdown, or asset pipeline errors.

2. Visual QA matrix

- Pages: home, getting-started, API reference, long advanced doc.
- Modes: light and dark.
- Viewports: mobile, tablet, desktop.

3. Code sample QA

- Validate token readability and differentiation across representative language blocks.
- Validate inline code readability in paragraph context.

4. Interaction QA

- Validate sidebar expand/collapse and mobile overlay behavior.
- Validate TOC active section updates while scrolling.
- Validate theme toggle and persisted preference behavior.

5. Scope QA

- Confirm changes are confined to docs-site plus this planning document.

## 10. Risks and Mitigations

Risk: Reduced token contrast in one theme after palette update.

- Mitigation: explicit contrast checks across representative code samples in both themes.

Risk: Visual drift away from minimal tone.

- Mitigation: enforce restraint checklist during review, reject decorative-only additions.

Risk: Sidebar or TOC state clarity regression.

- Mitigation: targeted interaction QA for active, hover, and focus states.

Risk: Unexpected class generation gaps when dynamic classes are introduced.

- Mitigation: follow Stati class composition guidance and verify final output styles appear in built site.

## 11. Rollout Notes

Execution style for this effort:

- Single immediate implementation pass.
- No phased roadmap in this document.
- Follow with one review pass focused on readability and regressions.

## 12. Definition of Done

This initiative is complete when:

- Docs-site visual and code-highlighting updates are implemented and verified.
- Audience-fit and minimal-tone acceptance criteria are satisfied.
- Build, preview, and key docs interactions are stable.
- This design document remains accurate to implemented behavior.
