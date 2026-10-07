import { useState } from 'react'
import { updateProfile, changePassword } from '../api/httpApi.js'

export default function Profile({ user, onUserChanged, onLogout, logoutBusy }) {
  const [name,setName] = useState(user?.name || '')
  const [passwords,setPasswords] = useState({ currentPassword:'',newPassword:'',confirmPassword:'' })
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')
  async function save(event, passwordChange = false) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (passwordChange && passwords.newPassword !== passwords.confirmPassword) throw new Error('The new passwords do not match.')
      const updated = passwordChange ? await changePassword(passwords) : await updateProfile({ name })
      onUserChanged(updated)
      if (passwordChange) setPasswords({ currentPassword:'',newPassword:'',confirmPassword:'' })
      setNotice(passwordChange ? 'Password changed. Other sessions have been signed out.' : 'Display name saved.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (!user) return <section className="card"><h2>Profile is available with an account</h2><p>Mock mode uses browser data and has no account or password. Switch to the real API to use Profile.</p></section>
  return <>
    {error && <p className="error" role="alert">{error}</p>}<p role="status">{notice}</p>
    <div className="profile-grid"><section className="card"><h2>Your account</h2><form onSubmit={save}><fieldset disabled={busy}>
      <label htmlFor="profile-name">Display name</label><input id="profile-name" autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)} />
      <label htmlFor="profile-email">Email (read only)</label><input id="profile-email" type="email" readOnly value={user.email} />
      <p>Member since {user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}) : '—'}</p>
      <button>{busy ? 'Please wait…' : 'Save name'}</button>
    </fieldset></form></section>
    <section className="card"><h2>Change password</h2><p className="muted">Use 12–128 characters. Other sessions will be signed out.</p><form onSubmit={e=>save(e,true)}><fieldset disabled={busy}>
      {Object.entries({currentPassword:'Current password',newPassword:'New password',confirmPassword:'Confirm new password'}).map(([key,label])=><div key={key}><label htmlFor={key}>{label}</label><input id={key} type="password" autoComplete={key==='currentPassword'?'current-password':'new-password'} required minLength={12} maxLength={128} value={passwords[key]} onChange={e=>setPasswords({...passwords,[key]:e.target.value})} /></div>)}
      <button>{busy ? 'Please wait…' : 'Change password'}</button>
    </fieldset></form></section>
    <section className="card"><h2>About your budget</h2><p>Currency: Philippine peso (PHP).</p><p>Budgets apply to individual categories for the selected month. They are spending limits, not your bank balance.</p></section>
    <section className="card"><h2>Your session</h2><p>Log out when you finish using a shared device.</p><button className="secondary" disabled={busy || logoutBusy} onClick={onLogout}>{logoutBusy ? 'Logging out…' : 'Log out'}</button></section></div>
  </>
}
