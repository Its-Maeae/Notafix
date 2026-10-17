'use client'

import { useState } from 'react'
import { X, GraduationCap, Info, Star, BookOpen, Check } from 'lucide-react'
import { useApp, NewSubjectInput } from '@/components/AppProvider'
import Toggle from '@/components/ui/Toggle'
import {
  DEFAULT_YEAR_SUBJECTS, PREDEFINED_SUBJECTS, OBERSTUFE_SEMESTERS,
} from '@/types'

type Step = 'basics' | 'defaults' | 'oberstufe-subjects'

export default function NewYearModal({ onClose }: { onClose: () => void }) {
  const { years, addYear, addSubject } = useApp()

  const [step, setStep] = useState<Step>('basics')
  const [name, setName] = useState('')
  const [isOberstufe, setIsOberstufe] = useState(false)
  const [semester, setSemester] = useState<number>(1)
  const [createAll, setCreateAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Oberstufe: Fächerauswahl + Leistungskurse
  const [selected, setSelected] = useState<string[]>([...DEFAULT_YEAR_SUBJECTS])
  const [lks, setLks] = useState<string[]>([])

  const trimmed = name.trim()

  function toggleSubject(s: string) {
    if (selected.includes(s)) {
      setSelected(selected.filter(x => x !== s))
      setLks(lks.filter(x => x !== s))
    } else {
      setSelected([...selected, s])
    }
  }

  function toggleLk(s: string) {
    if (lks.includes(s)) setLks(lks.filter(x => x !== s))
    else if (lks.length < 2) setLks([...lks, s])
  }

  // ── Schritt 1 → 2 ────────────────────────────────────────────────────────
  async function handleContinue() {
    if (!trimmed) return
    setError('')
    if (isOberstufe) {
      // Bereits vorhandenes Halbjahr derselben Oberstufe nicht doppelt anlegen
      if (!createAll) {
        const dup = years.find(y => y.isOberstufe && y.groupName === trimmed && y.semester === semester)
        if (dup) {
          setError('Dieses Halbjahr existiert für diese Oberstufe bereits.')
          return
        }
      }
      setStep('oberstufe-subjects')
      return
    }
    setBusy(true)
    await addYear(trimmed)
    setBusy(false)
    setStep('defaults')
  }

  // ── Normales Schuljahr: Standardfächer ───────────────────────────────────
  async function addDefaults() {
    setBusy(true)
    for (const s of DEFAULT_YEAR_SUBJECTS) await addSubject(s)
    setBusy(false)
    onClose()
  }

  // ── Oberstufe anlegen ────────────────────────────────────────────────────
  async function createOberstufe() {
    setBusy(true)
    setError('')
    const subjects: NewSubjectInput[] = selected.map(s => ({
      name: s,
      isLeistungskurs: lks.includes(s),
    }))
    const semesters = createAll
      ? OBERSTUFE_SEMESTERS.map(s => s.semester as number)
      : [semester]

    // Rückwärts anlegen, damit 11/1 am Ende ausgewählt ist und in der Liste zuerst steht
    const ordered = [...semesters].reverse()
    for (const sem of ordered) {
      const exists = years.some(y => y.isOberstufe && y.groupName === trimmed && y.semester === sem)
      if (exists) continue
      await addYear({
        name: trimmed,
        isOberstufe: true,
        semester: sem,
        groupName: trimmed,
        subjects,
        select: sem === semesters[0],
      })
    }
    setBusy(false)
    onClose()
  }

  const stepTitle =
    step === 'basics' ? 'Neues Schuljahr'
    : step === 'defaults' ? 'Standardfächer'
    : 'Fächer & Leistungskurse'

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose} style={{ alignItems: 'center', paddingBottom: 0 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ borderRadius: 'var(--radius)', paddingBottom: 0, maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">{stepTitle}</h2>
          <button className="modal-close" onClick={onClose} disabled={busy}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* ───────── Schritt 1: Name + Oberstufe ───────── */}
          {step === 'basics' && (
            <>
              <div className="form-group">
                <label className="form-label">{isOberstufe ? 'Name der Oberstufe' : 'Name des Schuljahrs'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={isOberstufe ? 'z.B. Oberstufe 2025–2027' : 'z.B. 2024/2025'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !isOberstufe && handleContinue()}
                  autoFocus
                />
              </div>

              <div
                onClick={() => setIsOberstufe(!isOberstufe)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GraduationCap size={20} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ist das die Oberstufe?</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Mit Leistungskursen und Abirechner
                    </div>
                  </div>
                </div>
                <Toggle checked={isOberstufe} onChange={() => {}} />
              </div>

              {isOberstufe && (
                <>
                  <div style={{
                    display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, marginBottom: 14,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.35)',
                    fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-secondary)',
                  }}>
                    <Info size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ color: 'var(--text)' }}>Jedes Halbjahr ist einzeln.</strong>{' '}
                      In der Oberstufe gibt es pro Eintrag nur ein Halbjahr (11/1, 11/2, 12/1, 12/2)
                      – nicht mehr zwei wie in der Mittelstufe. Das Punktesystem (0–15) wird automatisch verwendet.
                    </div>
                  </div>

                  <div
                    onClick={() => setCreateAll(!createAll)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                      borderRadius: 10, cursor: 'pointer', marginBottom: 14,
                      background: 'var(--bg-card)', border: `1px solid ${createAll ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: createAll ? 'var(--accent)' : 'transparent',
                      border: `1.5px solid ${createAll ? 'var(--accent)' : 'var(--border-strong)'}`,
                    }}>
                      {createAll && <Check size={13} color="white" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Alle 4 Halbjahre direkt erstellen</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Mit denselben Kursen und Leistungskursen
                      </div>
                    </div>
                  </div>

                  {!createAll && (
                    <div className="form-group">
                      <label className="form-label">Halbjahr</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {OBERSTUFE_SEMESTERS.map(s => (
                          <button
                            key={s.semester}
                            onClick={() => setSemester(s.semester)}
                            style={{
                              flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 600,
                              fontSize: '0.88rem', cursor: 'pointer',
                              background: semester === s.semester ? 'var(--accent)' : 'var(--bg-card)',
                              color: semester === s.semester ? 'white' : 'var(--text-secondary)',
                              border: `1px solid ${semester === s.semester ? 'var(--accent)' : 'var(--border)'}`,
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 12 }}>{error}</p>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: 20 }}
                onClick={handleContinue}
                disabled={!trimmed || busy}
              >
                {busy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Weiter'}
              </button>
            </>
          )}

          {/* ───────── Schritt 2a: Standardfächer (Mittelstufe etc.) ───────── */}
          {step === 'defaults' && (
            <div style={{ textAlign: 'center', paddingBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(108,99,255,0.15)', border: '2px solid rgba(108,99,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <BookOpen size={26} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>Standardfächer hinzufügen?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: 16 }}>
                Sollen die typischen Schulfächer automatisch hinzugefügt werden?
              </p>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
                marginBottom: 24, padding: '12px 8px', background: 'var(--bg-card)', borderRadius: 10,
              }}>
                {DEFAULT_YEAR_SUBJECTS.map(n => (
                  <span key={n} style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem',
                    background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                  }}>{n}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={busy}>
                  Überspringen
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addDefaults} disabled={busy}>
                  {busy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Hinzufügen'}
                </button>
              </div>
            </div>
          )}

          {/* ───────── Schritt 2b: Oberstufe – Fächer + Leistungskurse ───────── */}
          {step === 'oberstufe-subjects' && (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.55, marginBottom: 6 }}>
                Wähle deine Fächer. Tippe auf den Stern, um bis zu <strong>2 Leistungskurse</strong> zu markieren.
                {createAll && ' Die Auswahl gilt für alle 4 Halbjahre.'}
              </p>
              <p style={{
                fontSize: '0.78rem', fontWeight: 600, marginBottom: 12,
                color: lks.length === 2 ? 'var(--accent)' : 'var(--text-muted)',
              }}>
                Leistungskurse: {lks.length} / 2
              </p>

              <div className="subject-grid" style={{ marginTop: 0, marginBottom: 20 }}>
                {PREDEFINED_SUBJECTS.map(s => {
                  const on = selected.includes(s)
                  const lk = lks.includes(s)
                  return (
                    <div key={s} style={{
                      display: 'flex', alignItems: 'stretch', borderRadius: 'var(--radius-sm)',
                      background: on ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      border: `1px solid ${lk ? 'var(--accent)' : on ? 'var(--border-strong)' : 'var(--border)'}`,
                      opacity: on ? 1 : 0.55,
                    }}>
                      <button
                        onClick={() => toggleSubject(s)}
                        style={{
                          flex: 1, padding: '10px 12px', textAlign: 'left', fontSize: '0.86rem',
                          fontWeight: 500, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        {s}
                      </button>
                      <button
                        onClick={() => toggleLk(s)}
                        disabled={!on || (!lk && lks.length >= 2)}
                        title="Leistungskurs"
                        style={{
                          padding: '0 10px', background: 'none', border: 'none',
                          cursor: on && (lk || lks.length < 2) ? 'pointer' : 'default',
                          opacity: on && (lk || lks.length < 2) ? 1 : 0.25,
                          color: lk ? '#ffb400' : 'var(--text-muted)',
                        }}
                      >
                        <Star size={17} fill={lk ? '#ffb400' : 'none'} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 12 }}>{error}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep('basics')} disabled={busy}>
                  Zurück
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={createOberstufe} disabled={busy}>
                  {busy
                    ? <span className="spinner" style={{ width: 16, height: 16 }} />
                    : createAll ? '4 Halbjahre erstellen' : 'Erstellen'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
