export function vercelConfig(env = process.env) {
  const configured = (env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  // Trust only deployment metadata/configuration, never the request's Host header.
  const origins = [...configured, ...[env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`)]
  if (!origins.length) throw new Error('Set CORS_ORIGINS to the HTTPS website origin.')
  for (const origin of origins) {
    const url = new URL(origin)
    if (url.protocol !== 'https:' || url.origin !== origin) throw new Error('Vercel origins must be exact HTTPS origins without a trailing slash.')
  }
  return { ...env, NODE_ENV: 'production', TRUST_PROXY_HOPS: '1', COOKIE_SAME_SITE: 'lax', CORS_ORIGINS: [...new Set(origins)].join(',') }
}
