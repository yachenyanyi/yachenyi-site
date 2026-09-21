import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;
const expectedOrigin = process.env.EXPECTED_SITE_ORIGIN ?? 'https://yachenyi.com';

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const files = await walk(rootPath);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const errors = [];

for (const file of htmlFiles) {
  const rel = relative(rootPath, file).split(sep).join('/');
  const html = await readFile(file, 'utf8');
  const isAdmin = rel.startsWith('admin/');
  const is404 = rel === '404.html';

  assert(/<title>[^<]+<\/title>/i.test(html), `${rel}: missing <title>`, errors);

  if (!isAdmin) {
    assert(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), `${rel}: missing meta description`, errors);

    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    assert(h1Count === 1, `${rel}: expected exactly one <h1>, found ${h1Count}`, errors);
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    assert(Boolean(canonical), `${rel}: missing canonical URL`, errors);
    if (canonical) {
      assert(canonical.startsWith(expectedOrigin + '/'), `${rel}: canonical must use ${expectedOrigin}, got ${canonical}`, errors);
    }
  }

  const hasNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (isAdmin || is404) {
    assert(hasNoindex, `${rel}: expected noindex`, errors);
  } else {
    assert(!hasNoindex, `${rel}: unexpected noindex`, errors);
  }

  for (const match of html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${rel}: invalid JSON-LD (${error.message})`);
    }
  }
}

const robotsPath = join(rootPath, 'robots.txt');
const robots = await readFile(robotsPath, 'utf8').catch(() => '');
assert(Boolean(robots), 'robots.txt: missing', errors);
assert(robots.includes('Disallow: /admin/'), 'robots.txt: /admin/ must be disallowed', errors);
assert(robots.includes(`Sitemap: ${expectedOrigin}/sitemap-index.xml`), 'robots.txt: production sitemap URL is missing or incorrect', errors);

assert(files.some((file) => relative(rootPath, file).split(sep).join('/') === 'sitemap-index.xml'), 'sitemap-index.xml: missing', errors);

if (errors.length) {
  console.error('Build verification failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Build verification passed for ${htmlFiles.length} HTML files using ${expectedOrigin}.`);
