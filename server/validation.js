const categories = ['Food', 'Transport', 'School', 'Bills', 'Personal', 'Other']
export const failure = (message, status = 400) => Object.assign(new Error(message), { status })
export function email(value) {
  if (typeof value !== 'string') throw failure('Enter a valid email address.')
  const result = value.trim().toLowerCase()
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw failure('Enter a valid email address.')
  return result
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw failure('Use a password with 12–128 characters.')
  return value
}
export function name(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) throw failure('Enter a name with 1–80 characters.')
  return value.trim()
}
export function amount(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100000000) throw failure('Enter an amount between PHP 0.01 and PHP 1,000,000.')
  return value
}
export function category(value) {
  if (!categories.includes(value)) throw failure('Choose a valid category.')
  return value
}
export function month(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) throw failure('Choose a valid month.')
  return value
}
export function expense(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > 120) throw failure('Enter a description with 1–120 characters.')
  const date = body.spent_on
  if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date)) throw failure('Choose a valid date.')
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw failure('Choose a valid date.')
  return { title, amount_centavos: amount(body.amount_centavos), category: category(body.category), spent_on: date }
}
