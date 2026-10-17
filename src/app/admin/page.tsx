'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Shield, LogOut, RefreshCw, Trash2, Ban, Wifi, WifiOff,
  ChevronDown, ChevronUp, RotateCcw, Eye, EyeOff, Activity, HardDrive,
  AlertTriangle, Check, X
} from 'lucide-react'

interface Session {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface LoginAttempt {
  id: string
  ipAddress: string
  success: boolean
  createdAt: string
}

interface UserStats {
  years: number
  subjects: number
  grades: number
  estimatedBytes: number
}

interface AdminUser {
  id: string
  email: string
  createdAt: string
  updatedAt: string
  passwordResetToken: string | null
  settings: { darkMode: boolean } | null
  activeSessions: Session[]
  loginAttempts: LoginAttempt[]
  stats: UserStats
}

interface BlockedIP {
  id: string
  ipAddress: string
  reason: string | null
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `vor ${hrs} Std.`
  return `vor ${Math.floor(hrs / 24)} Tagen`
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'blocked'>('users')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string; onConfirm: () => Promise<void> } | null>(null)
  const [newBlockIP, setNewBlockIP] = useState('')
  const [newBlockReason, setNewBlockReason] = useState('')

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    try {
      const [usersRes, ipsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/blocked-ips'),
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (ipsRes.ok) setBlockedIPs(await ipsRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function resetPassword(userId: string, email: string) {
    setConfirmAction({
      type: 'reset',
      label: `Passwort von "${email}" zurücksetzen?`,
      onConfirm: async () => {
        const res = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        if (res.ok) {
          showToast('Passwort zurückgesetzt. Nutzer muss neues Passwort festlegen.')
          load()
        } else {
          showToast('Fehler beim Zurücksetzen', 'error')
        }
      },
    })
  }

  async function deleteUser(userId: string, email: string) {
    setConfirmAction({
      type: 'delete',
      label: `Account "${email}" unwiderruflich löschen?`,
      onConfirm: async () => {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
        if (res.ok) {
          showToast('Account gelöscht')
          load()
        } else {
          showToast('Fehler beim Löschen', 'error')
        }
      },
    })
  }

  async function terminateSession(sessionId: string) {
    const res = await fetch('/api/admin/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    if (res.ok) { showToast('Sitzung beendet'); load() }
    else showToast('Fehler', 'error')
  }

  async function terminateAllSessions(userId: string) {
    const res = await fetch('/api/admin/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) { showToast('Alle Sitzungen beendet'); load() }
    else showToast('Fehler', 'error')
  }

  async function blockIP(ip: string, reason?: string) {
    const res = await fetch('/api/admin/blocked-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipAddress: ip, reason: reason || null }),
    })
    if (res.ok) { showToast(`IP ${ip} blockiert`); load() }
    else showToast('Fehler', 'error')
  }

  async function unblockIP(ip: string) {
    const res = await fetch('/api/admin/blocked-ips', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipAddress: ip }),
    })
    if (res.ok) { showToast(`IP ${ip} freigegeben`); load() }
    else showToast('Fehler', 'error')
  }

  async function handleAddBlock() {
    if (!newBlockIP.trim()) return
    await blockIP(newBlockIP.trim(), newBlockReason.trim() || undefined)
    setNewBlockIP('')
    setNewBlockReason('')
  }

  const totalGrades = users.reduce((a, u) => a + u.stats.grades, 0)
  const totalStorage = users.reduce((a, u) => a + u.stats.estimatedBytes, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-display)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'white',
          }}>
            <Shield size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Admin Panel</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notenrechner Verwaltung</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={load}>
            <RefreshCw size={14} />
            Aktualisieren
          </button>
          <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={handleLogout}>
            <LogOut size={14} />
            Abmelden
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Accounts', value: users.length, icon: <Users size={20} />, color: 'var(--accent)' },
            { label: 'Noten gesamt', value: totalGrades, icon: <Activity size={20} />, color: '#4bcc7a' },
            { label: 'Speicher (geschätzt)', value: formatBytes(totalStorage), icon: <HardDrive size={20} />, color: '#ffaa00' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: card.color }}>{card.icon}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['users', 'blocked'] as const).map(t => (
            <button
              key={t}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px' }}
              onClick={() => setTab(t)}
            >
              {t === 'users' ? `Accounts (${users.length})` : `Blockierte IPs (${blockedIPs.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : tab === 'users' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.length === 0 && (
              <div className="empty-state"><h3>Keine Accounts vorhanden</h3></div>
            )}
            {users.map(u => (
              <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', gap: 16 }}
                  onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{u.email}</span>
                      {u.passwordResetToken && (
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(255,165,0,0.15)', color: '#ffaa00',
                          border: '1px solid rgba(255,165,0,0.3)', fontWeight: 600,
                        }}>
                          Passwort-Reset ausstehend
                        </span>
                      )}
                      {u.activeSessions.length > 0 && (
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(75,255,154,0.1)', color: '#4bcc7a',
                          border: '1px solid rgba(75,255,154,0.3)', fontWeight: 600,
                        }}>
                          {u.activeSessions.length} aktiv
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{u.stats.years} Jahre</span>
                      <span>{u.stats.subjects} Fächer</span>
                      <span>{u.stats.grades} Noten</span>
                      <span>{formatBytes(u.stats.estimatedBytes)}</span>
                      <span>Registriert: {new Date(u.createdAt).toLocaleDateString('de-DE')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={e => { e.stopPropagation(); resetPassword(u.id, u.email) }}
                      title="Passwort zurücksetzen"
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={e => { e.stopPropagation(); deleteUser(u.id, u.email) }}
                      title="Account löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                    {expandedUser === u.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {expandedUser === u.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
                          Aktive Sitzungen ({u.activeSessions.length})
                        </h4>
                        {u.activeSessions.length === 0 ? (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Keine aktiven Sitzungen</p>
                        ) : (
                          <>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', marginBottom: 10, width: '100%' }}
                              onClick={() => terminateAllSessions(u.id)}
                            >
                              Alle beenden
                            </button>
                            {u.activeSessions.map(s => (
                              <div key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 6, fontSize: '0.8rem',
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 2 }}>
                                    {s.ipAddress || 'unbekannt'}
                                  </div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                                    {timeAgo(s.createdAt)}
                                    {s.userAgent && ` · ${s.userAgent.slice(0, 40)}…`}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {s.ipAddress && (
                                    <button
                                      title="IP blockieren"
                                      onClick={() => blockIP(s.ipAddress!)}
                                      style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,75,110,0.1)', border: '1px solid rgba(255,75,110,0.3)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      <Ban size={12} />
                                    </button>
                                  )}
                                  <button
                                    title="Sitzung beenden"
                                    onClick={() => terminateSession(s.id)}
                                    style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
                          Anmeldeversuche (letzte 30)
                        </h4>
                        {u.loginAttempts.length === 0 ? (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Keine Anmeldeversuche</p>
                        ) : (
                          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                            {u.loginAttempts.map(a => (
                              <div key={a.id} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                                background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 4, fontSize: '0.78rem',
                                borderLeft: `3px solid ${a.success ? '#4bcc7a' : 'var(--danger)'}`,
                              }}>
                                <span style={{ color: a.success ? '#4bcc7a' : 'var(--danger)', flexShrink: 0 }}>
                                  {a.success ? <Check size={12} /> : <X size={12} />}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', flex: 1 }}>
                                  {a.ipAddress}
                                </span>
                                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                                  {timeAgo(a.createdAt)}
                                </span>
                                <button
                                  title="IP blockieren"
                                  onClick={() => blockIP(a.ipAddress)}
                                  style={{ padding: '3px 6px', borderRadius: 4, background: 'rgba(255,75,110,0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                >
                                  <Ban size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 14 }}>IP-Adresse blockieren</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="form-input"
                  placeholder="IP-Adresse (z.B. 1.2.3.4)"
                  value={newBlockIP}
                  onChange={e => setNewBlockIP(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="form-input"
                  placeholder="Grund (optional)"
                  value={newBlockReason}
                  onChange={e => setNewBlockReason(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-danger" onClick={handleAddBlock} disabled={!newBlockIP.trim()}>
                  <Ban size={14} />
                  Blockieren
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedIPs.length === 0 && (
                <div className="empty-state"><h3>Keine blockierten IPs</h3></div>
              )}
              {blockedIPs.map(ip => (
                <div key={ip.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--danger)',
                }}>
                  <Ban size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--danger)' }}>
                      {ip.ipAddress}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {ip.reason && <span style={{ marginRight: 12 }}>{ip.reason}</span>}
                      Blockiert: {new Date(ip.createdAt).toLocaleString('de-DE')}
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => unblockIP(ip.ipAddress)}
                  >
                    <WifiOff size={13} />
                    Freigeben
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)} style={{ alignItems: 'center' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderRadius: 'var(--radius)', paddingBottom: 0, maxWidth: 400 }}>
            <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
              <AlertTriangle size={36} style={{ color: confirmAction.type === 'delete' ? 'var(--danger)' : '#ffaa00', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>{confirmAction.label}</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmAction(null)}>Abbrechen</button>
                <button
                  className={`btn ${confirmAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                  style={{ flex: 1, ...(confirmAction.type !== 'delete' ? { background: '#ffaa00' } : {}) }}
                  onClick={async () => { await confirmAction.onConfirm(); setConfirmAction(null) }}
                >
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'rgba(75,204,122,0.95)' : 'rgba(255,75,110,0.95)',
          color: 'white', padding: '12px 24px', borderRadius: 999,
          fontWeight: 600, fontSize: '0.88rem', zIndex: 999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
