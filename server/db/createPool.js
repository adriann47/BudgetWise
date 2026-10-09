import pg from 'pg'
import { readFileSync } from 'node:fs'
export function createPool(connectionString) {
if (!connectionString) throw new Error('DATABASE_URL is required. Configure server/.env first.')
const url = new URL(connectionString)
// Local development has no TLS. Hosted TLS verifies the server certificate.
const local = ['localhost', '127.0.0.1', '::1', '[::1]', 'db'].includes(url.hostname)
const tls = !local || process.env.DATABASE_SSL === 'true'
for (const parameter of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(parameter)
const ca = process.env.DATABASE_CA_PEM?.replace(/\\n/g, '\n') || (process.env.DATABASE_CA_FILE ? readFileSync(process.env.DATABASE_CA_FILE, 'utf8') : undefined)
const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: tls ? { rejectUnauthorized: true, ...(ca ? { ca } : {}) } : false,
  max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000,
})
pool.on('error', (error) => console.error('Database pool error:', error.code || error.name))
return pool
}
