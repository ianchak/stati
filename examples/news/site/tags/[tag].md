---
# One page per topic: Stati turns this file into /tags/guides, /tags/seo and so on, one for
# every tag the articles in site/news/ use. {tag} becomes the tag's name.
title: '{tag}'
description: 'Every story about {tag}, newest first.'
listing: tag
layout: /listing
collection: /news
generate:
  from: tags
  paginate: 12
---
