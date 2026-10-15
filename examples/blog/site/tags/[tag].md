---
# One page per tag: Stati turns this file into /tags/guides, /tags/writing and so on,
# one for every tag the posts in site/posts/ use. {tag} becomes the tag's name.
title: '{tag}'
heading: 'Posts tagged “{tag}”'
description: 'Every post on this blog tagged {tag}, newest first.'
listing: tag
collection: /posts
generate:
  from: tags
  paginate: 10
---
