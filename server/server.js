import { pool } from './db/pool.js'
import { createApp } from './app.js'
const app = createApp(pool)
const port = process.env.PORT || 3000
const server = app.listen(port, () => console.log(`BudgetWise API: http://localhost:${port}`))
async function stop() {
  server.close(async () => { await app.locals.sessionStore.close(); await pool.end(); process.exit(0) })
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)