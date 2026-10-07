import { useEffect, useState } from 'react'
import { createCategory, updateCategory } from '../api'

export default function CategoryManager({ categories, totals, onSaved, onView, adding, onClose }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const activeCount = categories.filter(c => !c.archived).length
  const archivedCount = categories.filter(c => c.archived).length
  useEffect(() => { if (adding) { setEditing(null); setForm({ name: '', description: '' }); setError('') } }, [adding])
  const close = () => { setEditing(null); setForm({ name: '', description: '' }); setError(''); onClose() }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (editing) await updateCategory(editing.id, form)
      else await createCategory(form)
      close(); await onSaved('Category saved.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  async function archive(item) {
    if (!item.archived && !window.confirm(`Archive ${item.name}? Past expenses and budgets will remain. Restore it anytime to use it again.`)) return
    setBusy(true); setError('')
    try { await updateCategory(item.id, { ...item, archived: !item.archived }); await onSaved(item.archived ? 'Category restored.' : 'Category archived. History preserved.') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <>
    <p className="inline-hint">Organize your spending. Renaming a category updates its label throughout your history. Archiving keeps its records.</p>
    <p className= "counter">
      <span className="active-text">{activeCount} active</span>
      <span className="archived-text">{archivedCount} archived</span>
    </p>
    {error && <p className="error" role="alert">{error}</p>}
    {(adding || editing) && <section className="card category-editor" aria-labelledby="category-editor-title">
      <h2 id="category-editor-title">{editing ? 'Edit category' : 'Add category'}</h2>
      <form onSubmit={save}><fieldset disabled={busy}>
        <label htmlFor="category-name">Name</label><input autoFocus id="category-name" maxLength={40} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label htmlFor="category-description">Description (optional)</label><input id="category-description" maxLength={200} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button>{busy ? 'Saving…' : 'Save category'}</button></div>
      </fieldset></form>
    </section>}
    <label className="checkbox-label"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} /> Show archived categories</label>
    {!categories.some(c => !c.archived) && <p className="inline-hint">No active categories. Add one above or show archived categories to restore one.</p>}
    <div className="category-grid">{categories.filter(c => showArchived || !c.archived).map((item,index) => {
      const total = totals.find(t => t.id === item.id)
      return <section className="card category-tile" key={item.id}>
        <span className={`category-badge tone-${index % 6}`}>{item.name.slice(0,1)}</span>
        <h2>{item.name}</h2>{item.archived && <span className="status-chip">Archived</span>}
        <p>{item.description || 'Your spending, organized your way.'}</p>
        <div className="category-tile-total"><strong>{new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format((total?.amount || 0)/100)}</strong><span>{total?.count || 0} expenses this month</span></div>
        <div className="category-actions"><button className="secondary" onClick={() => onView(item.name)}>View expenses</button><button className="secondary" disabled={busy || adding} onClick={() => { setEditing(item); setForm({ name:item.name,description:item.description }); setError('') }}>Edit</button><button className="secondary" disabled={busy} onClick={() => archive(item)}>{item.archived ? 'Restore' : 'Archive'}</button></div>
      </section>
    })}</div>
  </>
}
