import { useEffect, useRef, useState } from 'react'
import App from './App.jsx'
import { USING_MOCK_API } from './api'
import { getSession, login, register, logout } from './api/httpApi.js'

export default function AuthRoot() {
  const [user, setUser] = useState(null)
  const [state, setState] = useState(USING_MOCK_API ? 'demo' : 'loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function restore() {
    setState('loading'); setError('')
    try { const current = await getSession(); setUser(current); setState('ready') }
    catch { setState('error'); setError('We could not reach BudgetWise. Check that the API and database are running, then try again.') }
  }
  useEffect(() => {
    if (USING_MOCK_API) return
    restore()
    const expired = () => { setUser(null); setState('ready'); setError('Your session ended. Please log in again.') }
    window.addEventListener('budgetwise:session-expired', expired)
    return () => window.removeEventListener('budgetwise:session-expired', expired)
  }, [])
  async function signOut() {
    setBusy(true); setError('')
    try { await logout(); setUser(null); window.location.hash = '/login' }
    catch { setError('Logout could not be confirmed. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  if (USING_MOCK_API) return <App />
  if (state === 'loading' || state === 'error') return <main className="auth-status"><a className="auth-wordmark" href="#/login">BudgetWise</a><h1>{state === 'loading' ? 'Getting things ready...' : 'Let’s reconnect.'}</h1>{state === 'loading' ? <p role="status">Checking your session.</p> : <><p role="alert">{error}</p><button onClick={restore}>Try again</button></>}</main>
  if (user) return <><div className="account-strip"><span>Signed in as <strong>{user.name}</strong></span><button className="secondary" onClick={signOut} disabled={busy}>{busy ? 'Logging out...' : 'Log out'}</button></div>{error && <p className="account-error" role="alert">{error}</p>}<App key={user.id} /></>
  return <AuthScreen serverMessage={error} onAuthenticated={(current) => { setUser(current); setError(''); window.location.hash = '/dashboard' }} />
}

function AuthScreen({ onAuthenticated, serverMessage }) {
  const [mode, setMode] = useState(window.location.hash === '#/register' ? 'register' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const registering = mode === 'register'
  useEffect(() => {
    const change = () => { setMode(window.location.hash === '#/register' ? 'register' : 'login'); setError(''); setForm({ name: '', email: '', password: '', confirm: '' }); setVisible(false) }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  const field = (key) => ({ value: form[key], onChange: (event) => setForm({ ...form, [key]: event.target.value }) })
  async function submit(event) {
    event.preventDefault(); setError('')
    if (registering && form.password !== form.confirm) { setError('The passwords do not match. Please enter them again.'); requestAnimationFrame(() => errorRef.current?.focus()); return }
    setBusy(true)
    try {
      const current = registering ? await register({ name: form.name, email: form.email, password: form.password }) : await login({ email: form.email, password: form.password })
      onAuthenticated(current)
    } catch (caught) { setError(caught.message); requestAnimationFrame(() => errorRef.current?.focus()) }
    finally { setBusy(false) }
  }
  return <main className="auth-page"><section className="auth-story"><a className="auth-wordmark" href="#/login">BudgetWise</a><div><p className="eyebrow">SMALL STEPS. BETTER HABITS.</p><h1>A little clarity.<br />A lot more possibility.</h1><p>Keep track of the everyday, plan for what matters, and make your money feel a little simpler.</p><ul><li>Understand your spending</li><li>Build a budget that fits you</li><li>Keep your records in your own account</li></ul></div><span className="auth-story-footer">Made for your everyday.</span></section><section className="auth-panel"><a className="auth-wordmark mobile-wordmark" href="#/login">BudgetWise</a><div className="auth-form-wrap"><p className="eyebrow">{registering ? 'YOUR NEXT SMALL STEP' : 'GOOD TO SEE YOU AGAIN'}</p><h2>{registering ? 'Create your account' : 'Welcome back.'}</h2><p className="muted">{registering ? 'Start fresh. Your spending story belongs to you.' : 'Log in to pick up where you left off.'}</p>{(error || serverMessage) && <p ref={errorRef} tabIndex={-1} className="error" role="alert">{error || serverMessage}</p>}<form onSubmit={submit}><fieldset disabled={busy}>{registering && <><label htmlFor="auth-name">Your name</label><input id="auth-name" autoComplete="name" maxLength={80} required {...field('name')} /></>}<label htmlFor="auth-email">Email address</label><input id="auth-email" type="email"  autoComplete="email" maxLength={254} placeholder="Enter Email" required {...field('email')} /><label htmlFor="auth-password">Password</label><div className="password-field"><input id="auth-password" type={visible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={12} maxLength={128} aria-describedby={registering ? 'password-help' : undefined} required {...field('password')} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button></div>{registering && <><p id="password-help" className="field-help">Use 12–128 characters. A memorable phrase works well.</p><label htmlFor="auth-confirm">Confirm password</label><input id="auth-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required {...field('confirm')} /></>}<button className="save" type="submit">{busy ? 'Please wait...' : registering ? 'Create account' : 'Log in'}</button></fieldset></form><p className="auth-switch">{registering ? 'Already have an account?' : 'New to BudgetWise?'} <a aria-disabled={busy} href={registering ? '#/login' : '#/register'} onClick={(event) => { if (busy) event.preventDefault() }}>{registering ? 'Log in' : 'Create an account'}</a></p><p className="auth-fineprint">Your expenses and budgets are saved to your account. Only you can access them through the app.</p></div></section></main>
}