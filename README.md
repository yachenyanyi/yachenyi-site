# Yachenyi Site

Official website for **Yachenyi — Independent AI Software Studio**.

## Goals

- Fast, static-first public website
- SEO/GEO friendly HTML and structured metadata
- Projects, Services, Lab / Build Log, About, Contact and Facts pages
- Git-based content management
- GitHub-driven deployment to the self-hosted Ubuntu server

## Architecture

```text
Astro
├─ Public website
├─ Content collections
├─ SEO / GEO metadata
└─ Admin entry
      ↓
GitHub
      ↓
GitHub Actions / self-hosted runner
      ↓
Ubuntu + Nginx
      ↓
Cloudflare Tunnel
```

The current content-management direction is **Decap CMS**, with Keystatic retained as an alternative until the admin workflow is finalized.

## Repository boundaries

The public frontend and content-management UI live in this repository because they share one content model and release lifecycle.

A future independent CRM, customer portal, or OPC Control Center should be split only when it becomes a separate product/service.

## Status

Early bootstrap. Brand, sitemap and infrastructure decisions are tracked in Notion.
