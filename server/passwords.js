import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64, options)
  return `scrypt:${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, encoded] = stored.split(':')
  if (algorithm !== 'scrypt' || !salt || !encoded) return false
  const expected = Buffer.from(encoded, 'hex')
  const actual = await scrypt(password, salt, 64, options)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
