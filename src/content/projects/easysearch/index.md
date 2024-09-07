---
kind: "website"
name: "Easysearch"
image: ./easysearch-zoomed.png
description: Add a search function to your website quickly and easily. Easysearch builds and maintains a search index for you by crawling your site.
source: https://github.com/FluxCapacitor2/easysearch
date: 2024-07-15
addedDate: 2024-09-06
ongoing: true
tags:
  - go
  - sqlite
---

Easysearch is a simple way to add search to your website. You start it up with your site's URL, and it will find every page using a web crawler and build a search index for you. It comes with a prebuilt search page, or you can use the JSON results API for complete customization.

Key features include:

- Automated crawling and indexing of your site
- Scheduled content refreshes
- Sitemap scanning
- An API for search results
- Multi-tenancy
- A prebuilt search page that works without JavaScript (with [progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) for users with JS enabled)

This project is built with [Go](https://go.dev/) and requires [CGo](https://go.dev/wiki/cgo) due to the [SQLite](https://www.sqlite.org/) [dependency](https://github.com/mattn/go-sqlite3).

### Blog Posts

1. Building this project was my first experience with Go! I shared my thoughts on the language, especially in comparison to my previous experience with TypeScript and JVM languages, in [this blog post](/blog/notes-from-learning-go/).
2. Using with I learned about SQLite and its FTS5 (full-text search) extension, I wrote [this guide](/blog/sqlite-full-text-search) on implementing a search engine with SQLite. It's a good introduction if you're interested in building a project similar to mine.

## Why?

I wanted to add a search function to a website I was building. When I researched my available options, I found that:

- Google [Programmable Search Engine](https://programmablesearchengine.google.com/about/) (formerly Custom Search) wasn't customizable with the prebuilt widget and costs $5 per 1000 queries via the JSON API. It also only includes pages that are indexed by Google (obviously), so my results would be incomplete.
- [Algolia](https://www.algolia.com/) is a fully-managed SaaS that you can't self-host. While its results are incredibly good, they could change their offerings or pricing model at any time. Also, crawling is an additional cost.
- A custom search solution that uses my data would return the best quality results, but it takes time to build for each site and must be updated whenever my schema changes.

Easysearch is a FOSS alternative to the aforementioned products that addresses my primary pain points. **It's simple, runs anywhere, and lets you own your data.**

## Alternatives

- If you have a static site, check out [Pagefind](https://pagefind.app/). It runs search on the client-side and builds an index whenever you generate your site.
- For very small, personal sites, check out [Kagi Sidekick](https://sidekick.kagi.com/) when it launches.
- If you're a nonprofit, school, or government agency, you can disable ads on your Google Programmable Search Engine. See [this article](https://support.google.com/programmable-search/answer/12423873) for more info.

## Setup, Configuration, and Development

See [the project's README on GitHub](https://github.com/FluxCapacitor2/easysearch?tab=readme-ov-file#configuration) for a full setup guide.
