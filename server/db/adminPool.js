import { createPool } from './createPool.js'
// Only migration/setup/test tools import this module.
export const pool = createPool(process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL)
