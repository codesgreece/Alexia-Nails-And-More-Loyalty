import { FormEvent, useState } from 'react'
import { AuthShell } from '../components/AuthShell'
import { api } from '../lib/api'

export function AuthSetupPage({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Οι κωδικοί δεν ταιριάζουν')
      return
    }
    setBusy(true)
    try {
      const result = await api().auth.register({
        username,
        password,
        dateOfBirth
      })
      if (!result.success) {
        setError(result.error || 'Αποτυχία δημιουργίας λογαριασμού')
        return
      }
      localStorage.setItem('angel-nails-remember-user', username.trim())
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Σφάλμα εγγραφής')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <div className="auth-card-head">
        <h2>Create Account</h2>
        <p>Set up your local Angel Nails Club access</p>
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
            minLength={3}
          />
        </label>

        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M8 3v4M16 3v4M4 10h16" />
            </svg>
          </span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            aria-label="Ημερομηνία"
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
            autoComplete="new-password"
            required
            minLength={6}
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

        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <input
            type={showPass ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </label>

        <p className="auth-hint">
          Ο λογαριασμός αποθηκεύεται μόνο σε αυτόν τον υπολογιστή. Δεν απαιτείται internet.
        </p>

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? 'Creating...' : 'Create Account →'}
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
