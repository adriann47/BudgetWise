// Contract for the next milestone. Express expense routes are not implemented yet.
const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch { /* Keep the HTTP status if the response is not JSON. */ }
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}

export const listExpenses = () => request('/api/expenses')
export const createExpense = (input) => request('/api/expenses', { method: 'POST', body: JSON.stringify(input) })
export const deleteExpense = (id) => request(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })

// Matching contract only; these routes will be implemented with the backend.
export const listBudgets = () => request('/api/budgets')
export const saveBudget = (input) => request(`/api/budgets/${encodeURIComponent(input.month)}/${encodeURIComponent(input.category)}`, { method: 'PUT', body: JSON.stringify(input) })
