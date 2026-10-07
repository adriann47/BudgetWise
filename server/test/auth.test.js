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
  const pool = new pg.Pool({ ...adminPool.options, options: undefined })
  pool.on('connect', client => { client.query(`SET search_path TO "${schema}"`).catch(() => {}) })
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
    assert.equal((await pool.query('SELECT current_schema() AS name')).rows[0].name, schema)
    await pool.query(await readFile(new URL('../db/migrations/001-budgetwise.sql', import.meta.url), 'utf8'))
    const legacy = await pool.query("INSERT INTO users(name,email,password_hash) VALUES('Legacy','legacy@example.test','unused') RETURNING id")
    await pool.query("INSERT INTO expenses(user_id,title,amount_centavos,category,spent_on) VALUES($1,'Existing expense',1234,'Food','2026-10-01')",[legacy.rows[0].id])
    await pool.query("INSERT INTO budgets(user_id,month,category,amount_centavos) VALUES($1,'2026-10','Food',9999)",[legacy.rows[0].id])
    await pool.query(await readFile(new URL('../db/migrations/002-categories-profile.sql', import.meta.url), 'utf8'))
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM categories WHERE user_id=$1',[legacy.rows[0].id])).rows[0].n,6)
    const preserved = await pool.query('SELECT e.amount_centavos,b.amount_centavos AS budget,c.name FROM expenses e JOIN categories c ON c.id=e.category_id JOIN budgets b ON b.category_id=c.id WHERE e.user_id=$1',[legacy.rows[0].id])
    assert.deepEqual(preserved.rows[0],{amount_centavos:1234,budget:9999,name:'Food'})
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
    await t.test('categories isolate accounts; rename and archive preserve history', async () => {
      assert.equal((await alice.call('/api/categories')).data.length,6)
      const created=await alice.call('/api/categories','POST',{name:'Hobbies',description:'Things I enjoy'})
      assert.equal(created.status,201)
      const cat=created.data
      assert.equal((await bob.call('/api/categories/'+cat.id,'PUT',{name:'Stolen'})).status,404)
      assert.equal((await bob.call('/api/expenses','POST',{...expense,category_id:cat.id})).status,400)
      assert.equal((await bob.call('/api/budgets/2026-10/'+cat.id,'PUT',{amount_centavos:1000})).status,400)
      assert.equal((await alice.call('/api/categories','POST',{name:' hobbies '})).status,409)
      const exp=await alice.call('/api/expenses','POST',{...expense,category_id:cat.id})
      assert.equal(exp.status,201)
      assert.equal((await alice.call('/api/budgets/2026-10/'+cat.id,'PUT',{amount_centavos:20000})).status,200)
      assert.equal((await alice.call('/api/categories/'+cat.id,'PUT',{name:'Leisure',description:'Fun'})).status,200)
      assert.equal((await alice.call('/api/expenses')).data.find(e=>e.id===exp.data.id).category,'Leisure')
      assert.equal((await alice.call('/api/budgets')).data.find(b=>b.category_id===cat.id).category,'Leisure')
      assert.equal((await alice.call('/api/categories/'+cat.id,'PUT',{name:'Leisure',description:'Fun',archived:true})).status,200)
      assert.equal((await alice.call('/api/expenses','POST',{...expense,category_id:cat.id})).status,400)
      assert.equal((await alice.call('/api/budgets/2026-11/'+cat.id,'PUT',{amount_centavos:20000})).status,400)
      assert.ok((await alice.call('/api/expenses')).data.some(e=>e.id===exp.data.id))
      assert.equal((await alice.call('/api/categories/'+cat.id,'PUT',{name:'Leisure',archived:false})).status,200)
      assert.equal((await alice.call('/api/expenses','POST',{...expense,category_id:cat.id})).status,201)
    })
    await t.test('profile ownership, password validation and session invalidation', async () => {
      const original=(await alice.call('/api/profile')).data
      assert.ok(original.created_at)
      assert.equal((await alice.call('/api/profile','PATCH',{name:'Updated Alice',email:'ignored@example.test',id:9999})).data.email,original.email)
      assert.equal((await bob.call('/api/profile')).data.name,'Bob')
      const second=agent();await second.call('/api/auth/me')
      await second.call('/api/auth/login','POST',{email:original.email,password})
      const replacement='A different passphrase 928!'
      assert.equal((await alice.call('/api/profile/password','POST',{currentPassword:'An incorrect password',newPassword:replacement,confirmPassword:replacement})).status,400)
      assert.equal((await alice.call('/api/profile/password','POST',{currentPassword:password,newPassword:replacement,confirmPassword:'mismatch'})).status,400)
      assert.equal((await alice.call('/api/profile/password','POST',{currentPassword:password,newPassword:replacement,confirmPassword:replacement})).status,200)
      assert.equal((await alice.call('/api/expenses')).status,200)
      assert.equal((await second.call('/api/expenses')).status,401)
      assert.equal((await second.call('/api/auth/me')).data.user,null)
      assert.equal((await second.call('/api/auth/login','POST',{email:original.email,password})).status,401)
      assert.equal((await second.call('/api/auth/login','POST',{email:original.email,password:replacement})).status,200)
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