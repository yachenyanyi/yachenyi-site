---
title: Why this studio site is static-first
summary: The public Yachenyi site treats crawlability, speed and machine-readable structure as architecture constraints rather than launch-time polish.
publishedAt: 2026-09-20
tags: [Astro, SEO, GEO, Architecture]
draft: false
seo:
  title: Why Yachenyi is building a static-first studio site
  description: Notes on choosing Astro, static HTML, structured data and stable URLs for an AI-native independent studio website.
---

## Problem

A studio site is easy to overbuild. A full application framework, database and CMS can make a simple public site slower to maintain without improving the visitor experience.

At the same time, the site needs to be understandable by search engines, AI retrieval systems and people arriving directly at a project page.

## Design

The first version uses Astro and content collections so the primary output is complete HTML.

The architecture treats these as first-class requirements:

- stable URLs for projects, services and lab notes
- semantic HTML
- canonical metadata
- sitemap and robots rules
- structured data
- content that exists without client-side JavaScript

## Result

The public layer stays close to static files while the content workflow can still evolve independently through Git-based editing and automation.

## What changed

SEO and GEO stopped being a checklist added after development. They became constraints that shape routing, content models and deployment from the beginning.
