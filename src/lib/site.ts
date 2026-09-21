const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path = '/') {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalized;
  if (normalized === '/') return `${base}/`;
  return `${base}${normalized}`;
}
