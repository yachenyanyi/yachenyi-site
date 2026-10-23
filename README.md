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
- `src/styles/global.css`: base resets, typography and shared layout defaults.
- `src/styles/site`: glass theme modules for the site shell, home, content pages, motion, hero and navigation.
- `src/lib`: translations, base-path handling and homepage motion.
- `public/admin`: Decap CMS scaffold. Remote authentication still requires an OAuth proxy; this is not a finished management backend.

## Motion

The homepage uses a full-height landing stage with a perspective project ribbon
beneath the introduction. Drag horizontally to browse; vertical page scrolling
nudges the ribbon with a damped follow-through. Drag release coasts and settles
on the nearest project; hovering eases the card face upright and pauses the
ribbon while it is being inspected. A normal click still opens the project, while a drag suppresses
accidental navigation. Touch gestures keep vertical page scrolling available.

The rotation control pauses/resumes automatic motion and remembers the explicit
choice in local storage. Reduced-motion systems start with a static arc that is
still manually draggable; automatic rotation and scroll coupling require opt-in.
Keyboard focus pauses moving cards and brings the focused project to the center.
The homepage uses Lenis for wheel smoothing, retaining native touch scrolling
and the system reduced-motion preference.

## Deployment

After validation, changes are pushed to `main` by default. Cloudflare Pages deploys
the production site at **https://www.yachenyanyi.top**. The apex domain
`https://yachenyanyi.top` belongs to the separate Studio-Misaki site and must not be
repointed without an explicit migration decision.

The GitHub Pages workflow remains a separate fallback using the `/yachenyi-site`
base path. Its success alone does not verify the Cloudflare custom domain.
See [deployment details](docs/deployment/cloudflare-pages.md).

### Navigation and glass hero

The header uses one shared frosted dropdown that changes position and size between a project discovery list with a shared image preview, service image cards, and compact lab and studio lists. Project hover links a sliding selection to a blurred image crossfade; menu contents travel and crossfade while the outer glass stays clear. Desktop hover opens it; touch opens it on the first tap; the original page links remain usable. Arrow Down opens the panel for keyboard users and Escape returns focus to its trigger.

The homepage title remains semantic HTML with a WebGL rounded-glass volume layered in front. It refracts a texture sampled from the actual typeset heading, supports dragging, inertial rotation and angle controls, and redraws after language or size changes. Rendering pauses outside the viewport and automatic motion respects reduced-motion preferences. Without WebGL a CSS 3D glass cube with magnified title fragments preserves dragging and angle controls; the semantic heading remains visible. These are original implementations inspired by MotionSites Halden and Design World public previews.
