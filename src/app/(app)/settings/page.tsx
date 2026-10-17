'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Mail, Lock, Trash2, ChevronRight, LogOut, RefreshCw, Shield, Fingerprint, KeyRound } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import Toggle from '@/components/ui/Toggle'
import {
  isNativeApp, nativeReload,
  getSecuritySettings, setSecuritySettings, isBiometricAvailable,
} from '@/lib/native'

export default function SettingsPage() {
  const router = useRouter()
  const { settings, updateSettings, manualSync } = useApp()

  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSecurityForm, setShowSecurityForm] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [reloading, setReloading] = useState(false)

  // Native security state
  const [inNativeApp, setInNativeApp] = useState(false)
  const [lockEnabled, setLockEnabled] = useState(false)
  const [lockType, setLockType] = useState<'biometric' | 'password'>('biometric')
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    const native = isNativeApp()
    setInNativeApp(native)
    if (native) {
      getSecuritySettings().then(s => {
        setLockEnabled(s.lockEnabled)
        setLockType(s.lockType)
      })
      isBiometricAvailable().then(setBiometricAvailable)
    }
  }, [])

  async function handleReload() {
    setReloading(true)
    await manualSync()
    await nativeReload()
    setReloading(false)
  }

  async function handleToggleLock(enabled: boolean) {
    setLockEnabled(enabled)
    await setSecuritySettings({ lockEnabled: enabled, lockType })
  }

  async function handleChangeLockType(type: 'biometric' | 'password') {
    setLockType(type)
    await setSecuritySettings({ lockEnabled, lockType: type })
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else { setSuccess('Email erfolgreich geändert'); setShowEmailForm(false); setNewEmail('') }
    } finally { setLoading(false) }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (newPassword !== confirmPassword) { setError('Passwörter stimmen nicht überein'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else {
        setSuccess('Passwort erfolgreich geändert')
        setShowPasswordForm(false)
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      }
    } finally { setLoading(false) }
  }

  async function handleDeleteAccount() {
    setLoading(true)
    try {
      await fetch('/api/user', { method: 'DELETE' })
      router.push('/login'); router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.png" alt="Notafix"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain' }}
            onError={e => {
              e.currentTarget.style.display = 'none'
              const fb = e.currentTarget.nextElementSibling as HTMLElement
              if (fb) fb.style.display = 'flex'
            }}
          />
          <div style={{
            display: 'none', width: 36, height: 36, borderRadius: 10, background: 'var(--accent)',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem',
            color: 'white', flexShrink: 0, letterSpacing: '-0.03em',
          }}>NF</div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Einstellungen</h1>
        </div>
      </header>

      <div className="page-content">
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div style={{
            padding: '12px 16px', background: 'rgba(75,255,154,0.1)',
            border: '1px solid rgba(75,255,154,0.3)', borderRadius: 10,
            color: 'var(--success)', fontSize: '0.85rem', marginBottom: 16,
          }}>{success}</div>
        )}

        {/* Darstellung */}
        <div className="settings-section">
          <p className="settings-section-title">Darstellung</p>
          <div className="settings-item" onClick={() => updateSettings({ darkMode: !(settings?.darkMode ?? true) })}>
            <div className="settings-item-info">
              <span className="settings-item-title">
                {settings?.darkMode === false
                  ? <Sun size={16} style={{ display: 'inline', marginRight: 8 }} />
                  : <Moon size={16} style={{ display: 'inline', marginRight: 8 }} />}
                {settings?.darkMode === false ? 'Light Modus' : 'Dark Modus'}
              </span>
              <span className="settings-item-desc">Erscheinungsbild der App</span>
            </div>
            <Toggle checked={settings?.darkMode !== false} onChange={v => updateSettings({ darkMode: v })} />
          </div>
        </div>

        {/* Native App Funktionen */}
        {inNativeApp && (
          <>
            {/* Aktualisieren */}
            <div className="settings-section">
              <p className="settings-section-title">App</p>
              <div className="settings-item" onClick={handleReload} style={{ cursor: 'pointer' }}>
                <div className="settings-item-info">
                  <span className="settings-item-title">
                    <RefreshCw size={16} style={{ display: 'inline', marginRight: 8, animation: reloading ? 'spin 1s linear infinite' : 'none' }} />
                    Aktualisieren
                  </span>
                  <span className="settings-item-desc">Daten synchronisieren & App neu laden</span>
                </div>
                {reloading && <span className="spinner" style={{ width: 16, height: 16 }} />}
              </div>
            </div>

            {/* Sicherheit */}
            <div className="settings-section">
              <p className="settings-section-title">Sicherheit</p>
              <div className="settings-item" onClick={() => setShowSecurityForm(!showSecurityForm)}>
                <div className="settings-item-info">
                  <span className="settings-item-title">
                    <Shield size={16} style={{ display: 'inline', marginRight: 8 }} />
                    App-Sperre
                  </span>
                  <span className="settings-item-desc">
                    {lockEnabled
                      ? `Aktiv – ${lockType === 'biometric' ? 'Fingerabdruck' : 'PIN/Passwort'}`
                      : 'Deaktiviert'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle checked={lockEnabled} onChange={handleToggleLock} />
                  <ChevronRight size={18} style={{
                    color: 'var(--text-muted)',
                    transform: showSecurityForm ? 'rotate(90deg)' : '',
                    transition: 'transform 0.2s',
                  }} />
                </div>
              </div>

              {showSecurityForm && (
                <div style={{
                  padding: '16px 20px', background: 'var(--bg-card)',
                  borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Entsperrmethode wählen:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {biometricAvailable && (
                      <button
                        onClick={() => handleChangeLockType('biometric')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                          background: lockType === 'biometric' ? 'rgba(108,99,255,0.15)' : 'var(--bg)',
                          border: lockType === 'biometric' ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                          color: 'var(--text-primary)', textAlign: 'left',
                        }}
                      >
                        <Fingerprint size={24} style={{ color: lockType === 'biometric' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Fingerabdruck</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Entsperren mit Fingerabdruck-Sensor</div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => handleChangeLockType('password')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                        background: lockType === 'password' ? 'rgba(108,99,255,0.15)' : 'var(--bg)',
                        border: lockType === 'password' ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        color: 'var(--text-primary)', textAlign: 'left',
                      }}
                    >
                      <KeyRound size={24} style={{ color: lockType === 'password' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>PIN / Passwort</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Geräte-PIN oder Passwort verwenden</div>
                      </div>
                    </button>
                  </div>
                  {!lockEnabled && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
                      Aktiviere die App-Sperre oben, um diese Einstellung zu nutzen.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Account */}
        <div className="settings-section">
          <p className="settings-section-title">Account</p>

          <div className="settings-item" onClick={() => { setShowEmailForm(!showEmailForm); setShowPasswordForm(false) }}>
            <div className="settings-item-info">
              <span className="settings-item-title">
                <Mail size={16} style={{ display: 'inline', marginRight: 8 }} />
                Email ändern
              </span>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)', transform: showEmailForm ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }} />
          </div>

          {showEmailForm && (
            <form onSubmit={handleUpdateEmail} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="form-label">Neue Email-Adresse</label>
                <input type="email" className="form-input" value={newEmail} onChange={e => setNewEmail(e.target.value)} required autoComplete="email" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? <span className="spinner" /> : 'Speichern'}
              </button>
            </form>
          )}

          <div className="settings-item" onClick={() => { setShowPasswordForm(!showPasswordForm); setShowEmailForm(false) }}>
            <div className="settings-item-info">
              <span className="settings-item-title">
                <Lock size={16} style={{ display: 'inline', marginRight: 8 }} />
                Passwort ändern
              </span>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)', transform: showPasswordForm ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }} />
          </div>

          {showPasswordForm && (
            <form onSubmit={handleUpdatePassword} style={{ padding: '16px 20px', background: 'var(--bg-card)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div className="form-group">
                <label className="form-label">Aktuelles Passwort</label>
                <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Neues Passwort</label>
                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Passwort bestätigen</label>
                <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                {loading ? <span className="spinner" /> : 'Speichern'}
              </button>
            </form>
          )}
        </div>

        {/* Sitzung */}
        <div className="settings-section">
          <p className="settings-section-title">Sitzung</p>
          <div className="settings-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <div className="settings-item-info">
              <span className="settings-item-title" style={{ color: 'var(--accent)' }}>
                <LogOut size={16} style={{ display: 'inline', marginRight: 8 }} />
                Abmelden
              </span>
            </div>
          </div>
          <div className="settings-item" onClick={() => setShowDeleteConfirm(true)} style={{ cursor: 'pointer' }}>
            <div className="settings-item-info">
              <span className="settings-item-title" style={{ color: 'var(--danger)' }}>
                <Trash2 size={16} style={{ display: 'inline', marginRight: 8 }} />
                Konto löschen
              </span>
              <span className="settings-item-desc">Alle Daten werden unwiderruflich gelöscht</span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)} style={{ alignItems: 'center' }}>
            <div className="modal-content" style={{ borderRadius: 'var(--radius)', paddingBottom: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-body" style={{ padding: 32, textAlign: 'center' }}>
                <Trash2 size={40} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Konto löschen?</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
                  Alle deine Noten und Schuljahre werden unwiderruflich gelöscht.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Abbrechen</button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteAccount} disabled={loading}>
                    {loading ? <span className="spinner" /> : 'Löschen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Notafix v1.0.12 <br></br>
          Made by Marius Schmieder
        </div>
      </div>
    </div>
  )
}
