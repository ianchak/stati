---
'create-stati': patch
---

The blog and news starters list related posts and stories with `stati.collection.related()` instead of their own helpers, and new sites start on `@stati/core` ^2.11.0. In the news starter, a story from the same section now has to share a topic to count as related, and the related stories under an article no longer come up short when some of the best matches are already in "More in this section".
