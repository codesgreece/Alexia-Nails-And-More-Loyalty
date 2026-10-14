import { FormEvent, useEffect, useState } from 'react'
import { AuthShell } from '../components/AuthShell'
import { api } from '../lib/api'

const REMEMBER_KEY = 'angel-nails-remember-user'

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [forgotHint, setForgotHint] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setUsername(saved)
      setRemember(true)
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api().auth.login({ username, password })
      if (!result.success) {
        setError(result.error || 'Αποτυχία σύνδεσης')
        return
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim())
      else localStorage.removeItem(REMEMBER_KEY)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα σύνδεσης')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="auth-card-head">
        <h2>Welcome Back</h2>
        <p>Sign in to your Angel Nails Club account</p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
            </svg>
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
          />
        </label>

        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="auth-eye"
            aria-label={showPass ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
            onClick={() => setShowPass((v) => !v)}
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        </label>

        <div className="auth-row">
          <label className="auth-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <button
            type="button"
            className="auth-forgot"
            onClick={() => setForgotHint((v) => !v)}
          >
            Forgot password?
          </button>
        </div>

        {forgotHint ? (
          <p className="auth-hint">
            Τοπική εφαρμογή: αν ξεχάσατε τον κωδικό, επικοινωνήστε με τον τεχνικό υποστήριξης ή
            επαναφέρετε από αντίγραφο ασφαλείας.
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign In →'}
        </button>
      </form>

      <div className="auth-card-foot">
        <span className="auth-foot-rule" />
        <span className="auth-foot-heart" aria-hidden="true">
          ♥
        </span>
        <span className="auth-foot-rule" />
      </div>
      <p className="auth-slogan">Your Beauty. Your Rewards. Our Club.</p>
    </AuthShell>
  )
}
