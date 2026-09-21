import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL;
const base = process.env.SITE_BASE || undefined;

export default defineConfig({
  site,
  base,
  integrations: site
    ? [
        sitemap({
          filter: (page) => !page.includes('/admin/'),
        }),
      ]
    : [],
});
