'use client'

import { useEffect, useState } from 'react'
import { Lock, Fingerprint, KeyRound } from 'lucide-react'
import { getSecuritySettings, authenticate, isNativeApp } from '@/lib/native'

interface LockScreenProps {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [lockType, setLockType] = useState<'biometric' | 'password'>('biometric')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getSecuritySettings().then(s => {
      setLockType(s.lockType)
      // Automatisch biometrischen Dialog öffnen
      if (s.lockType === 'biometric') triggerAuth(s.lockType)
    })
  }, [])

  async function triggerAuth(type: 'biometric' | 'password') {
    setLoading(true)
    setError('')
    const success = await authenticate(type)
    setLoading(false)
    if (success) {
      onUnlock()
    } else {
      setError(type === 'biometric' ? 'Fingerabdruck nicht erkannt' : 'Falsches Passwort')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
      }}>
        <img
          src="/logo.png"
          alt="Notafix"
          style={{ width: 48, height: 48, objectFit: 'contain' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Notafix
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 48 }}>
        App ist gesperrt
      </p>

      <button
        onClick={() => triggerAuth(lockType)}
        disabled={loading}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 48px', cursor: 'pointer',
          transition: 'all 0.2s', color: 'var(--text-primary)',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {lockType === 'biometric'
          ? <Fingerprint size={48} style={{ color: 'var(--accent)' }} />
          : <KeyRound size={48} style={{ color: 'var(--accent)' }} />
        }
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          {loading ? 'Warten…' : lockType === 'biometric' ? 'Fingerabdruck' : 'PIN eingeben'}
        </span>
      </button>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.84rem', marginTop: 20 }}>
          {error}
        </p>
      )}
    </div>
  )
}
