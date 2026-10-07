const BASE = import.meta.env.VITE_API_BASE_URL || ''
let csrfToken = null
let sessionRequest = null
async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers },
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try { const body = await response.json(); if (body?.error) message = body.error } catch { /* Retain the HTTP status. */ }
    if (response.status === 401 && !path.startsWith('/api/auth/')) { csrfToken = null; window.dispatchEvent(new Event('budgetwise:session-expired')) }
    throw Object.assign(new Error(message), { status: response.status })
  }
  return response.status === 204 ? null : response.json()
}
export function getSession() {
  if (!sessionRequest) sessionRequest = request('/api/auth/me').then((data) => {
    csrfToken = data.csrfToken
    return data.user
  }).finally(() => { sessionRequest = null })
  return sessionRequest
}
async function authenticate(path, input) {
  await getSession()
  const data = await request(path, { method: 'POST', body: JSON.stringify(input) })
  csrfToken = data.csrfToken
  return data.user
}
export const login = (input) => authenticate('/api/auth/login', input)
export const register = (input) => authenticate('/api/auth/register', input)
export async function logout() {
  await request('/api/auth/logout', { method: 'POST', body: '{}' })
  csrfToken = null
}
export const listExpenses = () => request('/api/expenses')
export const createExpense = (input) => request('/api/expenses', { method: 'POST', body: JSON.stringify(input) })
export const deleteExpense = (id) => request(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE', body: '{}' })
export const listBudgets = () => request('/api/budgets')
export const saveBudget = (input) => request(`/api/budgets/${encodeURIComponent(input.month)}/${encodeURIComponent(input.category_id)}`, { method: 'PUT', body: JSON.stringify(input) })
export const deleteBudget = (month, category) => request(`/api/budgets/${encodeURIComponent(month)}/${encodeURIComponent(category)}`, { method: 'DELETE', body: '{}' })
export const listCategories = () => request('/api/categories')
export const createCategory = (input) => request('/api/categories', { method:'POST', body:JSON.stringify(input) })
export const updateCategory = (id,input) => request('/api/categories/'+encodeURIComponent(id), { method:'PUT', body:JSON.stringify(input) })
export const updateProfile = (input) => request('/api/profile', { method:'PATCH', body:JSON.stringify(input) })
export async function changePassword(input) {
  const data = await request('/api/profile/password', { method:'POST', body:JSON.stringify(input) })
  csrfToken = data.csrfToken
  return data.user
}
