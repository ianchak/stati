---
# One page per author: helpers/news.js turns this file into /authors/your-name and so on,
# one for everyone in site.authors in stati.config.js. {author} becomes their name.
title: '{author}'
description: 'Stories by {author}, newest first.'
listing: author
layout: /listing
generate:
  paginate: 12
---
