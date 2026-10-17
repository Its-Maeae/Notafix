'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [showReset, setShowReset] = useState(false)
  const [resetUserId, setResetUserId] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen')
      } else if (data.requiresPasswordReset) {
        setResetUserId(data.userId)
        setResetToken(data.resetToken)
        setShowReset(true)
      } else if (data.isAdmin) {
        router.push('/admin')
        router.refresh()
      } else {
        router.push('/half/1')
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, resetToken, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        router.push('/half/1')
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler.')
    } finally {
      setLoading(false)
    }
  }

  if (showReset) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <h1>Notafix</h1>
            <p>Schulnoten einfach verwalten</p>
          </div>

          <div style={{
            padding: '12px 16px',
            background: 'rgba(255, 165, 0, 0.12)',
            border: '1px solid rgba(255, 165, 0, 0.4)',
            borderRadius: 10,
            marginBottom: 20,
            fontSize: '0.88rem',
            color: '#ffaa00',
          }}>
            🔑 Der Administrator hat dein Passwort zurückgesetzt. Bitte lege jetzt ein neues Passwort fest.
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label className="form-label">Neues Passwort</label>
              <input
                type="password"
                className="form-input"
                placeholder="Mindestens 8 Zeichen"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Passwort bestätigen</label>
              <input
                type="password"
                className="form-input"
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Passwort festlegen'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Notafix</h1>
          <p>Schulnoten einfach verwalten</p>
        </div>

        <h2 className="auth-title">Anmelden</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email-Adresse</label>
            <input
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              type="password"
              className="form-input"
              placeholder="Passwort eingeben"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Anmelden'}
          </button>
        </form>

        <div className="auth-link">
          Noch kein Konto?{' '}
          <Link href="/register">Jetzt registrieren</Link>
        </div>
      </div>
    </div>
  )
}
