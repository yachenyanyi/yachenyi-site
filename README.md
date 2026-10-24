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

The homepage title remains selectable semantic HTML above a larger transparent WebGL glass cube. Its material retains refraction, RGB dispersion and edge highlights, sampling the photographic background beneath the text. The cube slowly auto-rotates on both pointer and touch devices, completing a turn in about 39 seconds. Actual mouse movement or a hovering pen anywhere in the viewport adds tilt around the viewer's axes and offsets its position by up to 22px horizontally and 14px vertically, with a subtle float of less than two pixels. Fingers and pen contact leave page gestures untouched and return the pointer offset to center; a mouse attached to a touch device still follows even if hover capability queries report otherwise. Rightward movement increases yaw and downward movement decreases pitch. Rendering pauses offscreen or when hidden and remains still for reduced-motion preferences. Without WebGL, a CSS 3D cube uses the same rotation, pointer response and layering. These are original implementations inspired by MotionSites Halden and Design World public previews.
