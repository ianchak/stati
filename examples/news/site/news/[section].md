---
# One page per section: helpers/news.js turns this file into /news/world, /news/politics and
# so on, one for every section in site.sections in stati.config.js. {section} becomes its title.
title: '{section}'
description: 'The latest {section} stories, newest first.'
listing: section
layout: /listing
generate:
  paginate: 12
---
