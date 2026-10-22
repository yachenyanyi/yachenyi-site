# Cloudflare Pages deployment

This repository is connected to the Cloudflare Pages project **yachenyi-site**.

- GitHub repository: https://github.com/yachenyanyi/yachenyi-site
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- Production URL: https://yachenyi-site.pages.dev
- Production environment variable: `SITE_URL=https://yachenyi-site.pages.dev`
- Preview builds: enabled for non-production branches

Cloudflare automatically builds and publishes when `main` receives a commit. Pull-request branches get preview deployments.

The Cloudflare site is separate from the existing GitHub Pages publishing workflow. Do not repoint `yachenyanyi.top` or remove the old site without an explicit migration decision.

## Check after deployment

1. Verify the deployment is successful in Cloudflare Pages.
2. Open the production URL and test routes, images, sitemap and canonical metadata.
3. If changing to a custom domain, set `SITE_URL` to that final origin, redeploy, and then update SEO assertions in GitHub CI.
4. Configure and verify the Decap CMS OAuth flow before using `/admin/` remotely.

The existing GitHub Pages workflow remains enabled; it can be retired separately after validation.
