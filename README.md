# Yachenyi Site

Static Astro website for **Yachenyi — Independent AI Software Studio**.

## Development

Use Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Validate a production build:

```sh
npm run check
SITE_URL=https://www.yachenyanyi.top npm run build
npm run verify:build
```

## Structure

- `src/pages`: homepage, projects, services, lab, about, contact and facts.
- `src/content`: Markdown content collections and SEO fields.
- `src/layouts/BaseLayout.astro`: shared navigation, language switch and footer.
- `src/styles/global.css`: base structure and shared page layout.
- `src/styles/glass-site.css`: current glass surfaces, responsive design and motion.
- `src/lib`: translations, base-path handling and homepage motion.
- `public/admin`: Decap CMS scaffold. Remote authentication still requires an OAuth proxy; this is not a finished management backend.

## Motion

The homepage selected-project cards form a moving perspective arc. A visible
rotation button pauses/resumes it. Systems requesting reduced motion start with
a static grid and can explicitly enable rotation using the same button.
Keyboard focus pauses moving cards so project links remain usable.

## Deployment

After validation, changes are pushed to `main` by default. Cloudflare Pages deploys
the production site at **https://www.yachenyanyi.top**. The apex domain
`https://yachenyanyi.top` belongs to the separate Studio-Misaki site and must not be
repointed without an explicit migration decision.

The GitHub Pages workflow remains a separate fallback using the `/yachenyi-site`
base path. Its success alone does not verify the Cloudflare custom domain.
See [deployment details](docs/deployment/cloudflare-pages.md).
