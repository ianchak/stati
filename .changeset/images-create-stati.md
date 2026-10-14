---
'create-stati': minor
---

New sites can add image tools: answer yes to the new prompt, or pass `--images`, to install `@stati/images` and turn on responsive images and link preview cards. The blog and docs templates then keep their own card template, `site/og.eta`, with its fonts; the blank template uses the built-in card and gets a `site.baseUrl`. Without image tools nothing changes. The blog and docs starters stop forcing their default social image onto every page when cards are generated, the style guide shows a captioned Markdown image, and the bundled agent skill documents Stati's image features.
