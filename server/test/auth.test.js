import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { pool as adminPool } from '../db/pool.js'
import { createApp } from '../app.js'

// Isolated, randomly named schema. Real accounts and tables are never reset.
test('PostgreSQL authentication, sessions, ownership and request protection', async (t) => {
  const schema = `bw_test_${randomBytes(8).toString('hex')}`
  assert.match(schema, /^bw_test_[a-f0-9]{16}$/)
  await adminPool.query(`CREATE SCHEMA "${schema}"`)
  const pool = new pg.Pool({ ...adminPool.options, options: `-c search_path=${schema}` })
  const config = { SESSION_SECRET: randomBytes(48).toString('hex'), CORS_ORIGINS: 'http://localhost:5173', NODE_ENV: 'test' }
  let app, server, base
  const start = async () => {
    app = createApp(pool, config)
    server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
    base = `http://127.0.0.1:${server.address().port}`
  }
  const stop = async () => { await new Promise((resolve) => server.close(resolve)); await app.locals.sessionStore.close() }
  function agent() {
    let cookie = '', csrf = ''
    return {
      get cookie() { return cookie },
      async call(path, method = 'GET', body, headers = {}) {
        const response = await fetch(base + path, { method, headers: { Cookie: cookie, Origin: 'http://localhost:5173', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
        const setCookie = response.headers.get('set-cookie')
        if (setCookie) cookie = setCookie.split(';')[0]
        const data = response.status === 204 ? null : await response.json()
        if (data?.csrfToken) csrf = data.csrfToken
        return { status: response.status, data, setCookie }
      },
    }
  }
  try {
    await pool.query(await readFile(new URL('../db/migrations/001-budgetwise.sql', import.meta.url), 'utf8'))
    await start()
    const alice = agent(), bob = agent(), stranger = agent()
    const password = 'Test-only passphrase 781!'
    const expense = { title: 'School supplies', category: 'School', amount_centavos: 12550, spent_on: '2026-10-01' }
    let id, authenticatedCookie
    await t.test('anonymous protection and signup validation', async () => {
      assert.equal((await stranger.call('/api/expenses')).status, 401)
      assert.equal((await alice.call('/api/auth/me')).data.user, null)
      assert.equal((await alice.call('/api/auth/register', 'POST', { name: 'Alice', email: 'a@example.test', password: 'short' })).status, 400)
      const guestCookie = alice.cookie
      const result = await alice.call('/api/auth/register', 'POST', { name: 'Alice', email: ' ALICE@example.test ', password })
      assert.equal(result.status, 201)
      assert.equal(result.data.user.email, 'alice@example.test')
      assert.equal(result.data.user.password_hash, undefined)
      assert.match(result.setCookie, /HttpOnly/i)
      assert.match(result.setCookie, /SameSite=Lax/i)
      assert.notEqual(alice.cookie, guestCookie)
      authenticatedCookie = alice.cookie
      const stored = await pool.query('SELECT password_hash FROM users WHERE email=$1', ['alice@example.test'])
      assert.match(stored.rows[0].password_hash, /^scrypt:/)
      assert.ok(!stored.rows[0].password_hash.includes(password))
    })
    await t.test('duplicate emails and incorrect credentials', async () => {
      await stranger.call('/api/auth/me')
      assert.equal((await stranger.call('/api/auth/register', 'POST', { name: 'Other', email: 'ALICE@example.test', password })).status, 409)
      assert.equal((await stranger.call('/api/auth/login', 'POST', { email: 'alice@example.test', password: 'Wrong passphrase 781!' })).status, 401)
      assert.equal((await stranger.call('/api/auth/login', 'POST', { email: 'missing@example.test', password })).status, 401)
    })
    await t.test('CSRF, origin and server validation', async () => {
      assert.equal((await alice.call('/api/expenses', 'POST', expense, { 'X-CSRF-Token': 'bad' })).status, 403)
      assert.equal((await alice.call('/api/expenses', 'POST', expense, { Origin: 'https://untrusted.example' })).status, 403)
      assert.equal((await alice.call('/api/expenses', 'POST', { ...expense, amount_centavos: -1 })).status, 400)
      assert.equal((await alice.call('/api/expenses', 'POST', { ...expense, spent_on: '2026-02-30' })).status, 400)
      const result = await alice.call('/api/expenses', 'POST', { ...expense, user_id: 9999 })
      assert.equal(result.status, 201); id = result.data.id
      assert.equal(result.data.spent_on, expense.spent_on)
      assert.equal(result.data.amount_centavos, 12550)
    })
    await t.test('two accounts cannot read, modify or delete each other’s data', async () => {
      await bob.call('/api/auth/me')
      assert.equal((await bob.call('/api/auth/register', 'POST', { name: 'Bob', email: 'bob@example.test', password })).status, 201)
      assert.deepEqual((await bob.call('/api/expenses')).data, [])
      assert.equal((await bob.call(`/api/expenses/${id}`, 'DELETE', {})).status, 404)
      assert.equal((await bob.call(`/api/expenses/${id}`, 'PUT', expense)).status, 404)
      assert.equal((await alice.call('/api/budgets/2026-10/Food', 'PUT', { amount_centavos: 100000 })).status, 200)
      assert.deepEqual((await bob.call('/api/budgets')).data, [])
      assert.equal((await bob.call('/api/budgets/2026-10/Food', 'DELETE', {})).status, 404)
      assert.equal((await alice.call('/api/expenses')).data.length, 1)
    })
    await t.test('session and account data survive API restart', async () => {
      await stop(); await start()
      assert.equal((await alice.call('/api/auth/me')).data.user.email, 'alice@example.test')
      assert.equal((await alice.call('/api/expenses')).data[0].id, id)
    })
    await t.test('logout invalidates the old cookie; login restores account', async () => {
      assert.equal((await alice.call('/api/auth/logout', 'POST', {})).status, 204)
      assert.equal((await stranger.call('/api/expenses', 'GET', undefined, { Cookie: authenticatedCookie })).status, 401)
      await alice.call('/api/auth/me')
      assert.equal((await alice.call('/api/auth/login', 'POST', { email: 'alice@example.test', password })).status, 200)
      assert.equal((await alice.call('/api/expenses')).data.length, 1)
      assert.equal((await alice.call(`/api/expenses/${id}`, 'DELETE', {})).status, 204)
    })
    await t.test('expired sessions are rejected', async () => {
      await pool.query("UPDATE user_sessions SET expire=now()-interval '1 minute'")
      assert.equal((await alice.call('/api/expenses')).status, 401)
    })
    await t.test('repeated authentication attempts are throttled', async () => {
      await stranger.call('/api/auth/me')
      let status
      for (let i = 0; i < 31; i++) status = (await stranger.call('/api/auth/login', 'POST', { email: 'bad', password: 'short' })).status
      assert.equal(status, 429)
    })
  } finally {
    if (server?.listening) await stop()
    await pool.end()
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`)
    await adminPool.end()
  }
})