import { createPool } from './createPool.js'
export const pool = createPool(process.env.DATABASE_URL)
