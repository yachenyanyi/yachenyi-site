import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const lines = [
    'User-agent: *',
    `Allow: ${base || '/'}/`,
    `Disallow: ${base}/admin/`,
  ];

  if (site) {
    const sitemapPath = `${base}/sitemap-index.xml`.replace(/^\/+/, '');
    lines.push('', `Sitemap: ${new URL(sitemapPath, site).href}`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
