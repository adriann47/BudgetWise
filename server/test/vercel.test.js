import { test } from 'node:test'
import assert from 'node:assert/strict'
import { vercelConfig } from '../vercelConfig.js'

test('Vercel uses exact configured origins and HTTPS cookies', () => {
  const config = vercelConfig({ VERCEL_URL: 'preview.example.test', VERCEL_PROJECT_PRODUCTION_URL: 'budgetwise.example.test' })
  assert.equal(config.CORS_ORIGINS, 'https://preview.example.test,https://budgetwise.example.test')
  assert.equal(config.NODE_ENV, 'production')
  assert.equal(config.TRUST_PROXY_HOPS, '1')
  assert.equal(config.COOKIE_SAME_SITE, 'lax')
})
test('Vercel rejects missing origins, wildcards, HTTP and paths', () => {
  for (const origin of ['', '*', 'http://example.test', 'https://example.test/path', 'https://example.test/']) {
    assert.throws(() => vercelConfig({ CORS_ORIGINS: origin }))
  }
})
test('Explicit custom domains are supported', () => {
  assert.equal(vercelConfig({ CORS_ORIGINS: 'https://my-budget.example.test' }).CORS_ORIGINS, 'https://my-budget.example.test')
})
