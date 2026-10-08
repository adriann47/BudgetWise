import CategoryManager from './components/CategoryManager.jsx'
import Profile from './components/Profile.jsx'
import { useEffect, useRef, useState } from 'react'
import { listExpenses, createExpense, deleteExpense, listBudgets, saveBudget, listCategories } from './api'
import DemoNotice from './components/DemoNotice.jsx'
import Icon from './components/Icon.jsx'

const NAV = ['dashboard', 'expenses', 'budgets', 'categories']
const TITLES = { profile: ['YOUR ACCOUNT', 'Make yourself at home.', 'Manage your profile and account security.'], dashboard: ['YOUR MONEY, AT A GLANCE', 'A clearer picture of your spending.', 'Small steps today. Better money habits tomorrow.'], expenses: ['THE EVERYDAY DETAILS', 'Every expense tells a story.', 'Find, review and keep track of the little things.'], budgets: ['MAKE ROOM FOR WHAT MATTERS', 'Give your spending a plan.', 'Set a monthly limit for each category and see how you’re doing.'], categories: ['A PLACE FOR EVERY EXPENSE', 'See where it all goes.', 'Create and manage the categories that fit your life.'] }
const money = (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
const label = (name) => name.charAt(0).toUpperCase() + name.slice(1)
const currentPage = () => [...NAV, 'profile'].includes(window.location.hash.slice(2)) ? window.location.hash.slice(2) : 'dashboard'
function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const emptyForm = () => ({ title: '', amount: '', category: 'Food', spent_on: today() })

function Modal({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { dialog.close() } }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === ref.current) onClose() }}><div className="modal-body"><div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>{children}</div></dialog>
}

function ExpenseList({ rows, busy, onDelete, onAdd, filtered = false }) {
  if (!rows.length) return <div className="empty"><span className="empty-icon"><Icon name="expenses" size={28} /></span><h3>{filtered ? 'No matching expenses.' : 'A fresh start.'}</h3><p>{filtered ? 'Try another description or category.' : 'No expenses for this month. Add one to get started.'}</p>{!filtered && <button className="secondary" onClick={onAdd}>Add your first expense</button>}</div>
  return <ul className="expense-list">{rows.map((row) => <li key={row.id}><span className={`category-badge tone-${(Number(row.category_id) || 0) % 6}`} aria-hidden="true">{row.category.slice(0, 1)}</span><div className="expense-info"><h3>{row.title}</h3><p>{row.category} · <time dateTime={row.spent_on}>{new Date(`${row.spent_on}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</time></p></div><div className="expense-actions"><strong>{money(row.amount_centavos)}</strong><button className="delete" disabled={busy} onClick={() => onDelete(row)} aria-label={`Delete ${row.title}`}>Delete</button></div></li>)}</ul>
}

export default function App({ user, onUserChanged, onLogout, logoutBusy }) {
  const [page, setPage] = useState(currentPage)
  const [rows, setRows] = useState([])
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [addingCategory, setAddingCategory] = useState(false)
  const CATEGORIES = categories.map(c => c.name)
  const activeCategories = categories.filter(c => !c.archived)
  const activeNames = activeCategories.map(c => c.name)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [month, setMonth] = useState(today().slice(0, 7))
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [sort, setSort] = useState('newest')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' })
  const [formError, setFormError] = useState('')
  const heading = useRef(null)
  useEffect(() => { const change = () => { setPage(currentPage()); setNotice(''); window.scrollTo(0, 0); requestAnimationFrame(() => heading.current?.focus()) }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change) }, [])
  async function load() {
    setStatus('loading'); setError('')
    const timer = setTimeout(() => setSlow(true), 3000)
    try { const [expenses, limits, groups] = await Promise.all([listExpenses(), listBudgets(), listCategories()]); setRows(expenses); setBudgets(limits); setCategories(groups); setStatus('ready') }
    catch (caught) { setError(caught.message); setStatus('error') }
    finally { clearTimeout(timer); setSlow(false) }
  }
  useEffect(() => { load() }, [])
  const selected = rows.filter((row) => row.spent_on.startsWith(month))
  const total = selected.reduce((sum, row) => sum + row.amount_centavos, 0)
  const totals = categories.map(({ id, name, archived }) => ({ id, name, archived, amount: selected.filter((row) => row.category === name).reduce((sum, row) => sum + row.amount_centavos, 0), count: selected.filter((row) => row.category === name).length }))
  const limits = budgets.filter((budget) => budget.month === month)
  const planned = limits.reduce((sum, budget) => sum + budget.amount_centavos, 0)
  const budgetedSpent = totals.filter((item) => limits.some((budget) => budget.category === item.name)).reduce((sum, item) => sum + item.amount, 0)
  const filtered = selected.filter((row) => row.title.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === 'All categories' || row.category === categoryFilter)).sort((a, b) => sort === 'highest' ? b.amount_centavos - a.amount_centavos : sort === 'oldest' ? a.spent_on.localeCompare(b.spent_on) : b.spent_on.localeCompare(a.spent_on))
  const openExpense = () => { if (!activeNames.length) { setError('Add or restore a category before recording an expense.'); window.location.hash='/categories'; return } setForm({ ...emptyForm(), category: activeNames[0] }); setFormError(''); setModal('expense') }
  const openBudget = (category = activeNames[0]) => { if (!category) { setError('Add or restore a category before setting a budget.'); window.location.hash='/categories'; return } const existing = limits.find((item) => item.category === category); setBudgetForm({ category, amount: existing ? String(existing.amount_centavos / 100) : '' }); setFormError(''); setModal('budget') }
  const closeModal = () => { if (!busy) setModal(null) }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setFormError(''); setNotice('')
    try {
      if (modal === 'expense') {
        const created = await createExpense({ title: form.title, amount_centavos: Math.round(Number(form.amount) * 100), category_id: categories.find(c => c.name === form.category)?.id, spent_on: form.spent_on })
        setRows((current) => [created, ...current].sort((a, b) => b.spent_on.localeCompare(a.spent_on))); setMonth(created.spent_on.slice(0, 7)); setNotice('Expense added. Your overview is up to date.')
      } else {
        const saved = await saveBudget({ category_id: categories.find(c => c.name === budgetForm.category)?.id, amount_centavos: Math.round(Number(budgetForm.amount) * 100), month })
        setBudgets((current) => [...current.filter((item) => !(item.month === saved.month && item.category === saved.category)), saved]); setNotice(`${saved.category} budget saved.`)
      }
      setModal(null)
    } catch (caught) { setFormError(caught.message) }
    finally { setBusy(false) }
  }
  async function remove(row) {
    if (!window.confirm(`Delete “${row.title}”?`)) return
    setBusy(true); setError(''); setNotice('')
    try { await deleteExpense(row.id); setRows((current) => current.filter((item) => item.id !== row.id)); setNotice('Expense deleted.') }
    catch (caught) { setError(caught.message) }
    finally { setBusy(false) }
  }
  const field = (name) => ({ value: form[name], onChange: (event) => setForm({ ...form, [name]: event.target.value }) })
  function viewCategory(name) { setCategoryFilter(name); setQuery(''); window.location.hash = '/expenses' }

  return <div className="page">
    <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); heading.current?.focus() }}>Skip to content</a>
    <header className="app-header"><a className="brand" href="#/dashboard"><span className="brand-mark" aria-hidden="true">B</span>BudgetWise</a><nav className="main-nav" aria-label="Main navigation">{NAV.map((name) => <a key={name} href={`#/${name}`} aria-current={page === name ? 'page' : undefined}><Icon name={name} /><span>{label(name)}</span></a>)}</nav><a className="profile-link" href="#/profile" aria-current={page === 'profile' ? 'page' : undefined}>Profile</a></header>
    <main id="main"><div className="intro"><div><p className="eyebrow">{TITLES[page][0]}</p><h1 ref={heading} tabIndex={-1}>{TITLES[page][1]}</h1><p className="muted">{TITLES[page][2]}</p></div>{page !== 'profile' && <button disabled={status !== 'ready'} onClick={page === 'categories' ? () => setAddingCategory(true) : page === 'budgets' ? () => openBudget() : openExpense}><Icon name="plus" />{page === 'categories' ? 'Add category' : page === 'budgets' ? 'Set a budget' : 'Add expense'}</button>}</div>
      <DemoNotice />
      {page !== 'profile' && <div className="section-heading"><h2>{page === 'dashboard' ? 'Your overview' : page === 'expenses' ? 'Your expense history' : page === 'budgets' ? 'Your monthly plan' : 'Your categories'}</h2><label className="month-label" htmlFor="month">Month<input id="month" type="month" required value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value) }} /></label></div>}
      {error && <div className="error" role="alert">{error}{status === 'error' && <button onClick={load}>Try again</button>}</div>}
      <p className="announcement" role="status">{notice}</p>
      {status === 'loading' && <p role="status">{slow ? 'Still loading. The server may be waking up.' : 'Loading your overview…'}</p>}
      {status === 'ready' && <>
        {page === 'profile' && <Profile user={user} onUserChanged={onUserChanged} onLogout={onLogout} logoutBusy={logoutBusy} />}
        {page === 'dashboard' && <><section className="summary-grid" aria-label="Monthly summary"><div className="summary primary"><p>Total spent</p><strong>{money(total)}</strong><span>For the selected month</span></div><div className="summary"><p>Expenses recorded</p><strong>{selected.length}</strong><span>Every little thing, accounted for</span></div><div className="summary"><p>Top spending category</p><strong className="category-value">{[...totals].sort((a, b) => b.amount - a.amount)[0]?.amount ? [...totals].sort((a, b) => b.amount - a.amount)[0].name : 'No expenses yet'}</strong><span>Your biggest share this month</span></div></section><div className="workspace"><section className="card"><div className="section-heading"><h2>Recent expenses</h2><a className="text-link" href="#/expenses">View all <Icon name="arrow" size={16} /></a></div><ExpenseList rows={selected.slice(0, 5)} busy={busy} onDelete={remove} onAdd={openExpense} /></section><div><section className="card"><h2>Spending by category</h2>{totals.some((item) => item.amount) ? totals.filter((item) => item.amount).map((item) => <div className="category-row" key={item.name}><div><span>{item.name}</span><strong>{money(item.amount)}</strong></div><progress max={total} value={item.amount} aria-label={`${item.name} spending`} /></div>) : <p className="muted">Your breakdown appears after your first expense.</p>}</section><section className="plan-callout"><Icon name="budgets" size={26} /><h2>A little planning goes a long way.</h2><p>{limits.length ? `${limits.length} ${limits.length === 1 ? 'category has' : 'categories have'} a budget this month. See how your spending compares.` : 'Give each category a monthly limit and make room for the things you care about.'}</p><a className="text-link" href="#/budgets">{limits.length ? 'Review your budgets' : 'Plan your first budget'} <Icon name="arrow" size={16} /></a></section></div></div></>}
        {page === 'expenses' && <section className="card"><div className="filter-bar"><label className="search-field"><span className="sr-only">Search expenses</span><Icon name="search" /><input type="search" placeholder="Search your expenses…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select></label><label><span className="sr-only">Sort expenses</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option></select></label></div><div className="results-heading"><span>{filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}</span><strong>{money(filtered.reduce((sum, row) => sum + row.amount_centavos, 0))}</strong></div>{(query || categoryFilter !== 'All categories') && <button className="clear-filters" onClick={() => { setQuery(''); setCategoryFilter('All categories') }}>Clear filters</button>}<ExpenseList rows={filtered} busy={busy} onDelete={remove} onAdd={openExpense} filtered={Boolean(query || categoryFilter !== 'All categories')} /></section>}
        {page === 'budgets' && <><section className="summary-grid"><div className="summary primary"><p>Total planned</p><strong>{money(planned)}</strong><span>{limits.length} {limits.length === 1 ? 'category' : 'categories'} with a limit</span></div><div className="summary"><p>Spent in budgeted categories</p><strong>{money(budgetedSpent)}</strong><span>Spent without a budget: {money(total - budgetedSpent)}</span></div><div className="summary"><p>{planned - budgetedSpent < 0 ? 'Over budget across planned categories' : 'Remaining across budgeted categories'}</p><strong>{money(Math.abs(planned - budgetedSpent))}</strong><span>Excludes spending without a budget; not your available cash</span></div></section><section className="card unbudgeted"><h2>Spent without a budget: {money(total - budgetedSpent)}</h2><p className="muted">Spending in categories with no limit set for this month. Spending above an existing limit stays in budgeted spending.</p>{totals.filter(item => item.amount > 0 && !limits.some(b => b.category_id === item.id)).map(item => <div className="unbudgeted-row" key={item.id}><span>{item.name}{item.archived ? ' (archived)' : ''}: {money(item.amount)}</span>{item.archived ? <a href="#/categories">Restore category to set a budget</a> : <button className="secondary" onClick={() => openBudget(item.name)}>Set budget</button>}</div>)}{total === budgetedSpent && <p>No spending without a budget this month.</p>}</section>{!limits.length && <p className="inline-hint">Start small: choose one category below and set a limit for this month.</p>}<div className="category-grid">{totals.filter(item => !item.archived || item.amount || limits.some(b => b.category_id === item.id)).map((item, index) => { const limit = limits.find((budget) => budget.category === item.name)?.amount_centavos; const percent = limit ? Math.round(item.amount / limit * 100) : 0; let budgetStatus
        if (!limit) {
          budgetStatus = 'No limit set'
        } else if (item.amount > limit) {
          budgetStatus = 'Over budget'
        } else if (item.amount === limit) {
          budgetStatus = 'Limit reached'
        } else if (percent >= 80) {
          budgetStatus = 'Getting close'
        } else {
          budgetStatus = 'On track'
        } return <section className="card budget-card" key={item.name}><div className="section-heading"><span className={`category-badge tone-${index % 6}`}>{item.name.slice(0, 1)}</span><span className={`status-chip ${item.amount > limit ? 'over' : ''}`}>{budgetStatus}</span></div><h2>{item.name}</h2><p className="budget-amount"><strong>{money(item.amount)}</strong><span>{limit ? ` of ${money(limit)}` : ' spent'}</span></p><progress aria-label={`${item.name} budget used`} max={limit || 1} value={limit ? Math.min(item.amount, limit) : 0} /><p className="muted">{limit ? `${money(Math.abs(limit - item.amount))} ${item.amount > limit ? 'over your limit' : 'remaining'} · ${percent}% used` : 'Set a limit to start tracking progress.'}</p><button className="secondary" disabled={item.archived} onClick={() => openBudget(item.name)}>{item.archived ? 'Archived - restore to edit' : limit ? 'Edit budget' : 'Set budget'}</button></section> })}</div></>}
        {page === 'categories' && <CategoryManager categories={categories} totals={totals} adding={addingCategory} onClose={() => setAddingCategory(false)} onView={viewCategory} onSaved={async (message) => { setCategoryFilter('All categories'); await load(); setNotice(message) }} />}
      </>}
      <footer className="page-footer"><span>BudgetWise · Small steps, better habits.</span><span>Made for your everyday.</span></footer>
    </main>
    {modal && <Modal title={modal === 'expense' ? 'Add an expense' : `Set your ${month} budget`} onClose={closeModal}><p className="muted">{modal === 'expense' ? 'A quick note now, a clearer picture later.' : 'Choose a category and give your spending a little direction.'}</p>{formError && <p className="error" role="alert">{formError}</p>}<form onSubmit={submit}><fieldset disabled={busy}>{modal === 'expense' ? <><label htmlFor="title">Description</label><input autoFocus id="title" placeholder="e.g. Lunch at the canteen" maxLength={120} required {...field('title')} /><label htmlFor="amount">Amount (PHP)</label><input id="amount" type="number" inputMode="decimal" placeholder="0.00" min="0.01" max="1000000" step="0.01" required {...field('amount')} /><label htmlFor="category">Category</label><select id="category" {...field('category')}>{activeNames.map((name) => <option key={name}>{name}</option>)}</select><label htmlFor="date">Date</label><input id="date" type="date" required {...field('spent_on')} /></> : <><label htmlFor="budget-category">Category</label><select autoFocus id="budget-category" value={budgetForm.category} onChange={(event) => { const category = event.target.value; const amount = limits.find((item) => item.category === category)?.amount_centavos; setBudgetForm({ category, amount: amount ? String(amount / 100) : '' }) }}>{activeNames.map((name) => <option key={name}>{name}</option>)}</select><label htmlFor="budget-amount">Monthly limit (PHP)</label><input id="budget-amount" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" placeholder="e.g. 2,000" required value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} /></>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeModal}>Cancel</button><button type="submit">{busy ? 'Saving…' : modal === 'expense' ? 'Save expense' : 'Save budget'}</button></div></fieldset></form></Modal>}
  </div>
}

