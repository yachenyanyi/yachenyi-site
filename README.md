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
- `src/styles/index.css`: the ordered style import entry; no component declarations.
- `src/styles/foundation`, `shared`, `components`, `pages`: document defaults, reusable primitives, component-owned styles, and page backgrounds/layouts. See `src/styles/README.md` for the directory map.
- `agent.md`: mandatory component styling and collaboration rules; `AGENTS.md` is the automatic agent entry point.
- `src/lib`: translations, base-path handling and homepage motion.
- `public/admin`: Decap CMS scaffold. Remote authentication still requires an OAuth proxy; this is not a finished management backend.

## Motion

The homepage presents featured projects in a sticky workspace window. Scrolling changes the active project and moves the abstract diagrams; project tabs allow direct selection and the motion control pauses and resumes scroll-driven changes. Reduced-motion preferences disable automatic movement while keeping the tabs usable. The original cartographic illustration is implemented in `src/components/CartographicArt.astro`.

## Deployment

After validation, changes are pushed to `main` by default. Cloudflare Pages deploys
the production site at **https://www.yachenyanyi.top**. The apex domain
`https://yachenyanyi.top` belongs to the separate Studio-Misaki site and must not be
repointed without an explicit migration decision.

The GitHub Pages workflow remains a separate fallback using the `/yachenyi-site`
base path. Its success alone does not verify the Cloudflare custom domain.
See [deployment details](docs/deployment/cloudflare-pages.md).

### Navigation

The shared navigation dropdown changes size and position between sections. Desktop hover opens it; touch opens it on the first tap. Arrow Down opens the panel for keyboard users and Escape returns focus to its trigger.
