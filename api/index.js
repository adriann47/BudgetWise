import { attachDatabasePool } from '@vercel/functions'
import { pool } from '../server/db/pool.js'
import { createApp } from '../server/app.js'
import { vercelConfig } from '../server/vercelConfig.js'

attachDatabasePool(pool)
// Export a request handler; Vercel manages the HTTP listener and its lifetime.
export default createApp(pool, vercelConfig())
