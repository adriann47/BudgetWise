import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { rateLimit } from 'express-rate-limit'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { hashPassword, verifyPassword } from './passwords.js'
import * as validate from './validation.js'

const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email })
const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()))
const save = (req) => new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()))
const destroy = (req) => new Promise((resolve, reject) => req.session.destroy((error) => error ? reject(error) : resolve()))
const token = () => randomBytes(32).toString('hex')
const sameToken = (a, b) => typeof a === 'string' && typeof b === 'string' && /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const dummyHash = await hashPassword(randomBytes(32).toString('hex'))

export function createApp(pool, config = process.env) {
  if (!config.SESSION_SECRET || config.SESSION_SECRET.length < 32) throw new Error('Set SESSION_SECRET to at least 32 random characters.')
  const production = config.NODE_ENV === 'production'
  const origins = (config.CORS_ORIGINS || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean)
  const sameSite = config.COOKIE_SAME_SITE || 'lax'
  if (!['lax', 'strict', 'none'].includes(sameSite) || (sameSite === 'none' && !production)) throw new Error('Cross-site cookies require HTTPS production mode.')
  const cookie = { httpOnly: true, secure: production, sameSite, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
  const app = express()
  app.disable('x-powered-by')
  if (config.TRUST_PROXY_HOPS) app.set('trust proxy', Number(config.TRUST_PROXY_HOPS))
  app.use(helmet())
  app.use(cors({ origin: origins, credentials: true }))
  app.use(express.json({ limit: '16kb' }))
  app.get('/healthz', (req, res) => res.json({ ok: true }))
  app.get('/readyz', route(async (req, res) => {
    try { await pool.query('SELECT 1 FROM users LIMIT 1'); res.json({ ok: true, db: 'up' }) }
    catch { res.status(503).json({ ok: false, db: 'down or migrations missing' }) }
  }))
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  const Store = connectPgSimple(session)
  const store = new Store({ pool, tableName: 'user_sessions', createTableIfMissing: false, pruneSessionInterval: 900 })
  app.locals.sessionStore = store
  app.use('/api', session({ name: 'budgetwise.sid', secret: config.SESSION_SECRET, store, resave: false, saveUninitialized: false, cookie }))

  // Both the allowed Origin and a session-bound token are required on mutations.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (!origins.includes(req.get('origin'))) return res.status(403).json({ error: 'Request origin is not allowed.' })
    if (!req.is('application/json')) return res.status(415).json({ error: 'Send JSON data.' })
    if (!sameToken(req.get('x-csrf-token'), req.session.csrfToken)) return res.status(403).json({ error: 'Session check failed. Reload the page and try again.' })
    next()
  })
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please wait 15 minutes before trying again.' } })
  app.use('/api/auth', (req, res, next) => ['POST'].includes(req.method) ? authLimit(req, res, next) : next())

  app.get('/api/auth/me', route(async (req, res) => {
    if (!req.session.csrfToken) req.session.csrfToken = token()
    let user = null
    if (req.session.userId) {
      const result = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [req.session.userId])
      if (result.rows[0]) user = publicUser(result.rows[0])
      else delete req.session.userId
    }
    await save(req)
    res.json({ user, csrfToken: req.session.csrfToken })
  }))
  async function signIn(req, res, user, status = 200) {
    await regenerate(req)
    req.session.userId = user.id
    req.session.csrfToken = token()
    await save(req)
    res.status(status).json({ user: publicUser(user), csrfToken: req.session.csrfToken })
  }
  app.post('/api/auth/register', route(async (req, res) => {
    const body = req.body || {}
    const name = validate.name(body.name)
    const email = validate.email(body.email)
    const password = validate.password(body.password)
    const passwordHash = await hashPassword(password)
    try {
      const result = await pool.query('INSERT INTO users(name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email', [name, email, passwordHash])
      await signIn(req, res, result.rows[0], 201)
    } catch (error) {
      if (error.code === '23505') throw validate.failure('An account with this email already exists. Log in instead.', 409)
      throw error
    }
  }))
  app.post('/api/auth/login', route(async (req, res) => {
    const email = validate.email(req.body?.email)
    const password = validate.password(req.body?.password)
    const result = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=$1', [email])
    const user = result.rows[0]
    const valid = await verifyPassword(password, user?.password_hash || dummyHash)
    if (!user || !valid) throw validate.failure('Email or password is incorrect.', 401)
    await signIn(req, res, user)
  }))
  app.post('/api/auth/logout', route(async (req, res) => {
    await destroy(req)
    const { maxAge, ...clearOptions } = cookie
    res.clearCookie('budgetwise.sid', clearOptions)
    res.status(204).end()
  }))

  app.use('/api', route(async (req, res, next) => {
    if (!req.session.userId) throw validate.failure('Please log in to continue.', 401)
    const result = await pool.query('SELECT id FROM users WHERE id=$1', [req.session.userId])
    if (!result.rowCount) throw validate.failure('Please log in to continue.', 401)
    next()
  }))
  const expenseColumns = "id,title,amount_centavos,category,to_char(spent_on,'YYYY-MM-DD') AS spent_on"
  app.get('/api/expenses', route(async (req, res) => {
    const result = await pool.query(`SELECT ${expenseColumns} FROM expenses WHERE user_id=$1 ORDER BY spent_on DESC,id DESC`, [req.session.userId])
    res.json(result.rows)
  }))
  app.post('/api/expenses', route(async (req, res) => {
    const data = validate.expense(req.body || {})
    const result = await pool.query(`INSERT INTO expenses(user_id,title,amount_centavos,category,spent_on) VALUES ($1,$2,$3,$4,$5) RETURNING ${expenseColumns}`, [req.session.userId, data.title, data.amount_centavos, data.category, data.spent_on])
    res.status(201).json(result.rows[0])
  }))
  function expenseId(req) {
    if (!/^[1-9]\d{0,9}$/.test(req.params.id) || Number(req.params.id) > 2147483647) throw validate.failure('Expense not found.', 404)
    return Number(req.params.id)
  }
  app.put('/api/expenses/:id', route(async (req, res) => {
    const id = expenseId(req)
    const data = validate.expense(req.body || {})
    const result = await pool.query(`UPDATE expenses SET title=$1,amount_centavos=$2,category=$3,spent_on=$4 WHERE id=$5 AND user_id=$6 RETURNING ${expenseColumns}`, [data.title, data.amount_centavos, data.category, data.spent_on, id, req.session.userId])
    if (!result.rowCount) throw validate.failure('Expense not found.', 404)
    res.json(result.rows[0])
  }))
  app.delete('/api/expenses/:id', route(async (req, res) => {
    const result = await pool.query('DELETE FROM expenses WHERE id=$1 AND user_id=$2 RETURNING id', [expenseId(req), req.session.userId])
    if (!result.rowCount) throw validate.failure('Expense not found.', 404)
    res.status(204).end()
  }))
  app.get('/api/budgets', route(async (req, res) => {
    const result = await pool.query('SELECT month,category,amount_centavos FROM budgets WHERE user_id=$1 ORDER BY month DESC,category', [req.session.userId])
    res.json(result.rows)
  }))
  app.put('/api/budgets/:month/:category', route(async (req, res) => {
    const month = validate.month(req.params.month)
    const category = validate.category(req.params.category)
    const amount = validate.amount(req.body?.amount_centavos)
    const result = await pool.query('INSERT INTO budgets(user_id,month,category,amount_centavos) VALUES ($1,$2,$3,$4) ON CONFLICT(user_id,month,category) DO UPDATE SET amount_centavos=EXCLUDED.amount_centavos RETURNING month,category,amount_centavos', [req.session.userId, month, category, amount])
    res.json(result.rows[0])
  }))
  app.delete('/api/budgets/:month/:category', route(async (req, res) => {
    const result = await pool.query('DELETE FROM budgets WHERE user_id=$1 AND month=$2 AND category=$3 RETURNING month', [req.session.userId, validate.month(req.params.month), validate.category(req.params.category)])
    if (!result.rowCount) throw validate.failure('Budget not found.', 404)
    res.status(204).end()
  }))
  app.use((req, res) => res.status(404).json({ error: 'No such route.' }))
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    const status = error.status || 500
    if (status >= 500) console.error('API request failed:', error.code || error.name)
    res.status(status).json({ error: status < 500 ? (error.type === 'entity.parse.failed' ? 'Invalid JSON.' : error.message) : 'The server could not complete this request. Please try again.' })
  })
  return app
}