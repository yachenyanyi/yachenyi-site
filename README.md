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

The homepage uses a full-height landing stage with a perspective project ribbon
beneath the introduction. Drag horizontally to browse; vertical page scrolling
nudges the ribbon. A normal click still opens the project, while a drag suppresses
accidental navigation. Touch gestures keep vertical page scrolling available.

The rotation control pauses/resumes automatic motion and remembers the explicit
choice in local storage. Reduced-motion systems start with a static arc that is
still manually draggable; automatic rotation and scroll coupling require opt-in.
Keyboard focus pauses moving cards and brings the focused project to the center.

## Deployment

After validation, changes are pushed to `main` by default. Cloudflare Pages deploys
the production site at **https://www.yachenyanyi.top**. The apex domain
`https://yachenyanyi.top` belongs to the separate Studio-Misaki site and must not be
repointed without an explicit migration decision.

The GitHub Pages workflow remains a separate fallback using the `/yachenyi-site`
base path. Its success alone does not verify the Cloudflare custom domain.
See [deployment details](docs/deployment/cloudflare-pages.md).
