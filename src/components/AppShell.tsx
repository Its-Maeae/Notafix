'use client'

import { useEffect, useState, ReactNode } from 'react'
import LockScreen from './LockScreen'
import { getSecuritySettings, isNativeApp } from '@/lib/native'

export default function AppShell({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isNativeApp()) {
      setChecked(true)
      return
    }

    // Beim Start: Sperre prüfen
    getSecuritySettings().then(s => {
      setLocked(s.lockEnabled)
      setChecked(true)
    })

    // Timeout-Event von MainActivity (nach 2 Min. im Hintergrund)
    ;(window as any).__notafixLockTimeout = async () => {
      const s = await getSecuritySettings()
      if (s.lockEnabled) setLocked(true)
    }

    // Sicherheitsnetz: visibilitychange (Tab/App wieder sichtbar)
    // MainActivity setzt bereits das Timeout, aber als Fallback:
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const s = await getSecuritySettings()
        if (s.lockEnabled) {
          // Wird von MainActivity via __notafixLockTimeout gesteuert
          // Hier nur setzen wenn schon gesperrt war
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      delete (window as any).__notafixLockTimeout
    }
  }, [])

  if (!checked) return null
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />
  return <>{children}</>
}
