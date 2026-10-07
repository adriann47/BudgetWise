import { spawn, spawnSync } from 'node:child_process'
import { existsSync, openSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = fileURLToPath(new URL('../../.local/', import.meta.url))
const bin = path.join(root, 'postgres', 'pgsql', 'bin')
const control = path.join(bin, 'pg_ctl.exe')
const data = path.join(root, 'pgdata')
if (!existsSync(control) || !existsSync(data)) throw new Error('Project-local PostgreSQL is not initialized. See docs/week-2-auth.md for fresh setup.')
const action = process.argv[2]
if (!['start', 'stop', 'status'].includes(action)) throw new Error('Expected start, stop or status.')
if (action === 'start') {
  const status = spawnSync(control, ['-D', data, 'status'], { windowsHide: true, stdio: 'ignore' })
  if (status.status === 0) { console.log('PostgreSQL is already running.'); process.exit(0) }
  // Launch directly: pg_ctl's restricted-token launcher fails inside some Windows sandboxes.
  const log = openSync(path.join(root, 'postgres.log'), 'a')
  const processHandle = spawn(path.join(bin, 'postgres.exe'), ['-D', data], { windowsHide: true, detached: false, stdio: ['ignore', log, log] })
  closeSync(log)
  processHandle.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
  processHandle.unref()
  let ready = false
  for (let attempt = 0; attempt < 20; attempt++) {
    const check = spawnSync(path.join(bin, 'pg_isready.exe'), ['-h', '127.0.0.1', '-p', '5432'], { windowsHide: true, stdio: 'ignore' })
    if (check.status === 0) { ready = true; break }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!ready) throw new Error('PostgreSQL did not become ready. Read .local/postgres.log.')
  console.log('PostgreSQL is ready on 127.0.0.1:5432.')
} else {
  const result = spawnSync(control, ['-D', data, action], { windowsHide: true, stdio: 'inherit' })
  if (result.error) throw result.error
  process.exitCode = result.status
}