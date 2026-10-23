# Code audit — 2026-10-24

Review: Luna subagent reviewed the complete source, content models, public asset
references, build checks, deployment workflows and documentation. The primary
agent reviewed and applied the runtime, dependency and validation fixes, and
reviewed Luna's CSS cleanup.

## Findings and resolution

| Finding | Evidence | Resolution |
| --- | --- | --- |
| Reduced-motion fallback silently looked like an old homepage | Carousel deliberately omitted `is-orbit-ready` and hid the only control when reduced motion was requested | Respect the static default but show a translated Enable rotation button; explicit activation permits this carousel only |
| Missing observer APIs could abort subsequent homepage initialization | Carousel and gradient code constructed IntersectionObserver/ResizeObserver without checking availability | Add observer fallbacks, including resize events and a visible/static-safe initialization path |
| Legacy language geometry measurement was ineffective | Layout measured every translated element and resized text, while SaaS CSS forced those dimensions back to auto with important declarations | Delete measurement, geometry locks, resize-time body hiding and the redundant font-fitting loop; use responsive text reflow |
| Three generations of CSS and reveal animations overlapped | BaseLayout imported global, SaaS and glass styles; SaaS dashboard classes and old editorial homepage sections had no consumers | Remove SaaS stylesheet; retain necessary navigation/brand/Chinese-font details in glass styles; delete unused homepage layouts, breakpoints and duplicate reveal animations |
| Unreferenced second footer implementation remained | No page imported ImmersiveGlassFooter; the build verifier already prohibited its output | Delete the component and retain the shared BaseLayout footer |
| Dead translations were shipped to every page | 82 translation keys had no data-i18n/data-i18n-aria reference in current templates | Delete unused keys and validate active keys in generated HTML |
| Arbitrary CMS service slugs produced invalid image sources | Services allow create=true, but templates only mapped three IDs; undefined became `/` through withBase's default | Add a real fallback icon in both service templates |
| Dependency versions could move during installation | Direct dependencies used latest and workflows ran npm install | Pin direct versions, keep package-lock and use npm ci in GitHub workflows |
| Build validation did not check local asset/link existence | Existing checks primarily covered SEO, footer and sitemap | Check every generated local src/href path and translation key, for root and subpath builds |
| Old README described an unused deployment architecture | README claimed Ubuntu/Nginx/Tunnel and an undecided CMS, unlike the current deployment document | Document Astro, Cloudflare production, the GitHub Pages fallback and unfinished Decap authentication accurately |

## Boundaries and remaining limitations

- `www.yachenyanyi.top` is the Astro production site. The apex
  `yachenyanyi.top` deliberately remains the separate Studio-Misaki site, as
  specified in the deployment document. No DNS or migration changes were made.
- A screenshot alone does not establish the user's reduced-motion setting,
  script-loading result or cache version. The explicit rotation control makes
  the reduced-motion fallback actionable without changing system preferences.
- `/projects/` remains the separate project catalog. The rotating selected-work
  presentation is on the homepage; this audit does not replace catalog content.
- UI translation is client-side. Markdown content and SEO metadata remain
  English; full localized routes/content/metadata require a separate bilingual
  content implementation.
- Decap CMS authentication is still a scaffold awaiting its OAuth proxy. The
  audit does not configure or claim working remote login.
- Generated icon concepts are intentionally retained source assets according
  to the design documentation, rather than unused application code.
- This review does not claim that every browser or operating-system media
  preference has been tested.

## Validation

- Astro diagnostics: zero errors, warnings or hints.
- Production root build and verification: 17 HTML files.
- GitHub Pages `/yachenyi-site` subpath build and verification: 17 HTML files.
- Both builds check canonical metadata, structured JSON, shared footer count,
  robots/sitemap, local assets/links and all active translation keys.
- Live browser validation is performed after publishing the cleanup to main.
