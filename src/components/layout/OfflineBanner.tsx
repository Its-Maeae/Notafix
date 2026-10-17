'use client'

import { useApp } from '@/components/AppProvider'
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react'
import { useState } from 'react'

export default function OfflineBanner() {
  const { isOnline, pendingSync, manualSync } = useApp()
  const [syncing, setSyncing] = useState(false)

  if (isOnline && pendingSync === 0) return null

  async function handleSync() {
    setSyncing(true)
    try { await manualSync() } finally { setSyncing(false) }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      padding: '10px 16px',
      background: !isOnline ? 'rgba(20,20,28,0.97)' : 'rgba(108,99,255,0.95)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, fontSize: '0.82rem', fontWeight: 500,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isOnline ? <CloudOff size={15} /> : <RefreshCw size={15} />}
        {!isOnline
          ? `Offline${pendingSync > 0 ? ` – ${pendingSync} Änderung${pendingSync !== 1 ? 'en' : ''} ausstehend` : ''}`
          : `${pendingSync} Änderung${pendingSync !== 1 ? 'en' : ''} werden synchronisiert…`}
      </div>
      {isOnline && pendingSync > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
            color: 'white', cursor: syncing ? 'default' : 'pointer',
            padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 5,
            opacity: syncing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
          {syncing ? 'Läuft…' : 'Jetzt sync'}
        </button>
      )}
    </div>
  )
}
