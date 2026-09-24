import seed from './seed.json'

const KEY = 'budgetwise:expenses:v1'
const delay = () => new Promise((resolve) => setTimeout(resolve, 250))
const categories = ['Food', 'Transport', 'School', 'Bills', 'Personal', 'Other']

function read() {
  const stored = localStorage.getItem(KEY)
  if (stored === null) {
    localStorage.setItem(KEY, JSON.stringify(seed))
    return structuredClone(seed)
  }
  try {
    const rows = JSON.parse(stored)
    if (!Array.isArray(rows)) throw new Error()
    return rows
  } catch {
    throw new Error('Saved demo data could not be read. Your browser data has not been overwritten.')
  }
}

export async function listExpenses() {
  await delay()
  return read().sort((a, b) => b.spent_on.localeCompare(a.spent_on))
}

export async function createExpense(input) {
  await delay()
  const title = String(input.title || '').trim()
  if (!title || title.length > 120) throw new Error('Enter a description of 1–120 characters.')
  if (!Number.isSafeInteger(input.amount_centavos) || input.amount_centavos <= 0 || input.amount_centavos > 100000000) {
    throw new Error('Enter an amount between ₱0.01 and ₱1,000,000.')
  }
  if (!categories.includes(input.category)) throw new Error('Choose a valid category.')
  const date = new Date(`${input.spent_on}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.spent_on) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.spent_on) {
    throw new Error('Choose a valid expense date.')
  }
  const created = { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join(''), title, amount_centavos: input.amount_centavos, category: input.category, spent_on: input.spent_on }
  localStorage.setItem(KEY, JSON.stringify([created, ...read()]))
  return created
}

export async function deleteExpense(id) {
  await delay()
  const rows = read()
  if (!rows.some((row) => row.id === id)) throw new Error('Expense not found.')
  localStorage.setItem(KEY, JSON.stringify(rows.filter((row) => row.id !== id)))
  return null
}


// UI prototype budgets. The Express/PostgreSQL implementation is a later milestone.
const BUDGET_KEY = 'budgetwise:budgets:v1'
function readBudgets() {
  const stored = localStorage.getItem(BUDGET_KEY)
  if (!stored) return []
  try {
    const rows = JSON.parse(stored)
    if (!Array.isArray(rows)) throw new Error()
    return rows
  } catch { throw new Error('Saved demo budgets could not be read. Your data has not been overwritten.') }
}
export async function listBudgets() { await delay(); return readBudgets() }
export async function saveBudget(input) {
  await delay()
  if (!categories.includes(input.category)) throw new Error('Choose a valid category.')
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error('Choose a valid month.')
  if (!Number.isSafeInteger(input.amount_centavos) || input.amount_centavos <= 0 || input.amount_centavos > 100000000) throw new Error('Enter a limit between ₱0.01 and ₱1,000,000.')
  const saved = { month: input.month, category: input.category, amount_centavos: input.amount_centavos }
  const rows = readBudgets().filter((row) => !(row.month === saved.month && row.category === saved.category))
  localStorage.setItem(BUDGET_KEY, JSON.stringify([...rows, saved]))
  return saved
}
