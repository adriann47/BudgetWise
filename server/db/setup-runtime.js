import { randomBytes } from 'node:crypto'
import { readFile, writeFile, rename, unlink, mkdir } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { createPool } from './createPool.js'
import { grantRuntimeAccess } from './runtimeGrants.js'

const envPath = new URL('../.env', import.meta.url)
const pendingPath = new URL('../../.local/budgetwise-runtime.json', import.meta.url)
const role = 'budgetwise_app'
let admin, runtime, client, transaction = false
try {
  const original = await readFile(envPath, 'utf8')
  const env = parseEnv(original)
  const adminUrl = env.ADMIN_DATABASE_URL || env.DATABASE_URL
  if (!adminUrl) throw new Error('Configure DATABASE_URL first.')
  const url = new URL(adminUrl)
  const username = decodeURIComponent(url.username)
  if (username.split('.')[0] !== 'postgres') throw new Error('Setup expects the Supabase postgres administrator connection.')
  let saved
  try { saved = JSON.parse(await readFile(pendingPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const current = new URL(env.DATABASE_URL)
  const alreadyConfigured = decodeURIComponent(current.username).split('.')[0] === role
  const runtimeUrl = new URL(adminUrl)
  runtimeUrl.username = role + (username.includes('.') ? username.slice(username.indexOf('.')) : '')
  const password = alreadyConfigured ? decodeURIComponent(current.password) : saved?.password || randomBytes(32).toString('hex')
  runtimeUrl.password = password
  const target = `${url.host}${url.pathname}`
  if (saved && saved.target !== target) throw new Error('Pending setup belongs to a different database. Resolve it before continuing.')

  admin = createPool(adminUrl)
  client = await admin.connect()
  await client.query('BEGIN'); transaction = true
  await client.query('SELECT pg_advisory_xact_lock(284720)')
  const existing = await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])
  if (existing.rowCount && !alreadyConfigured && !saved) throw new Error('budgetwise_app already exists. Setup will not overwrite its password.')
  if (!existing.rowCount) {
    // Save a recovery credential before creating the role; .local/ is gitignored.
    await mkdir(new URL('../../.local/', import.meta.url), { recursive: true })
    await writeFile(pendingPath, JSON.stringify({ target, password }), { mode: 0o600 })
    const quoted = await client.query('SELECT quote_literal($1) AS value', [password])
    await client.query(`CREATE ROLE budgetwise_app LOGIN PASSWORD ${quoted.rows[0].value} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`)
  }
  const attrs = (await client.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])).rows[0]
  if (Object.values(attrs).some(Boolean)) throw new Error('Existing runtime role has administrative privileges; refusing to use it.')
  const memberships = await client.query('SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=$1',[role])
  if (memberships.rowCount) throw new Error('Runtime role has unexpected inherited role memberships.')
  const db = (await client.query('SELECT quote_ident(current_database()) AS name')).rows[0].name
  await client.query(`GRANT CONNECT ON DATABASE ${db} TO budgetwise_app`)
  await grantRuntimeAccess(client, role)
  await client.query('COMMIT'); transaction = false
  client.release(); client = undefined

  // A fresh login verifies the pooler accepts the role before switching the app.
  runtime = createPool(runtimeUrl.toString())
  const who = (await runtime.query('SELECT current_user AS name')).rows[0].name
  if (who !== role) throw new Error('Runtime connection did not use the expected role.')
  for (const table of ['users','categories','expenses','budgets','user_sessions']) await runtime.query(`SELECT 1 FROM public.${table} LIMIT 0`)
  const powers = (await runtime.query(`SELECT has_schema_privilege(current_user,'public','CREATE') AS schema_create,
    has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
    has_table_privilege(current_user,'public.users','TRUNCATE') AS truncate_users,
    has_table_privilege(current_user,'public.schema_migrations','INSERT') AS edit_migrations`)).rows[0]
  if (Object.values(powers).some(Boolean)) throw new Error('Runtime role still has unexpected privileges through existing grants.')

  if (await readFile(envPath, 'utf8') !== original) throw new Error('.env changed during setup. Run setup again.')
  let updated = original.replace(/^\s*(?:export\s+)?(?:ADMIN_DATABASE_URL|DATABASE_URL)\s*=.*(?:\r?\n|$)/gm, '')
  updated += `\n# Runtime account; administrator connection is for local tools only.\nDATABASE_URL=${JSON.stringify(runtimeUrl.toString())}\nADMIN_DATABASE_URL=${JSON.stringify(adminUrl)}\n`
  const temporary = new URL('../.env.runtime-tmp', import.meta.url)
  await writeFile(temporary, updated, { mode: 0o600 })
  await rename(temporary, envPath)
  await unlink(pendingPath).catch(error => { if (error.code !== 'ENOENT') console.warn('Setup succeeded; private recovery file remains in .local/.') })
  console.log('Runtime account verified and server/.env updated. Restart the Express server. Migrations and tests retain administrator access.')
} catch (error) {
  if (transaction) await client.query('ROLLBACK').catch(() => {})
  // Never log SQL, a connection string or a generated password.
  console.error('Runtime setup failed; restart is not required. Existing .env is kept until verification succeeds.')
  console.error(error.code ? `Error code: ${error.code}` : error.message)
  console.error('Fix the cause and rerun the same command; keep any private .local/budgetwise-runtime.json recovery file.')
  process.exitCode = 1
} finally {
  client?.release()
  await runtime?.end()
  await admin?.end()
}
