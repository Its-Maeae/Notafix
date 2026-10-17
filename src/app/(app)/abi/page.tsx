'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, GraduationCap, Smartphone, PenLine, Target, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, Plus, Trash2, Wand2, RotateCcw, Check,
} from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import { calculateSubjectAverage, getGradeColor } from '@/lib/grades'
import { OBERSTUFE_SEMESTERS } from '@/types'
import {
  AbiSubject, Cell, ExamState, EXAM_LABELS,
  evaluate, forecastFill, openKeys, solveGoal, subjectKey, fmtGrade,
} from '@/lib/abi'

type Mode = 'app' | 'manual'

interface Persisted {
  mode: Mode
  appEntries: Record<string, Cell>
  manual: AbiSubject[]
  exam: ExamState
  target: string
  goalOn: boolean
}

const DEFAULT_MANUAL = ['Deutsch', 'Mathematik', 'Englisch', 'Geschichte', 'Geographie', 'Physik', 'Chemie', 'Biologie', 'Informatik', 'Kunst', 'Musik', 'Ethik', 'Sport']

function makeManual(label: string): AbiSubject {
  return { key: subjectKey(label), label, isLK: false, cells: [null, null, null, null], locked: [false, false, false, false] }
}

const EMPTY_EXAM: ExamState = { keys: [null, null, null], points: [null, null, null, null, null] }

// ── Kleine UI-Bausteine ───────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 16, marginBottom: 14,
}
const sectionTitle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '22px 4px 10px',
}
const selectBase: React.CSSProperties = {
  width: '100%', padding: '8px 2px', borderRadius: 8, textAlign: 'center', textAlignLast: 'center',
  background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)',
  fontFamily: 'var(--font-mono)', fontSize: '0.85rem', appearance: 'none', WebkitAppearance: 'none',
}

function PointSelect({ value, suggestion, onChange, allowX = false, dim = false }: {
  value: Cell
  suggestion?: number
  onChange: (v: Cell) => void
  allowX?: boolean
  dim?: boolean
}) {
  const hasSug = value === null && suggestion !== undefined
  return (
    <select
      value={value === null ? '' : String(value)}
      onChange={e => {
        const v = e.target.value
        onChange(v === '' ? null : v === 'x' ? 'x' : Number(v))
      }}
      style={{
        ...selectBase,
        opacity: dim ? 0.45 : 1,
        color: hasSug ? 'var(--accent)' : value === 'x' ? 'var(--text-muted)' : 'var(--text)',
        border: hasSug ? '1px dashed var(--accent)' : selectBase.border,
        fontWeight: hasSug ? 700 : 400,
      }}
    >
      <option value="">{hasSug ? `→ ${suggestion}` : '–'}</option>
      {Array.from({ length: 16 }, (_, i) => 15 - i).map(p => <option key={p} value={p}>{p}</option>)}
      {allowX && <option value="x">✕ nicht belegt</option>}
    </select>
  )
}

function Segment<T extends string>({ value, options, onChange }: {
  value: T
  options: { id: T; label: string; icon: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, marginBottom: 14 }}>
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '9px 10px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600,
            background: value === o.id ? 'var(--accent)' : 'transparent',
            color: value === o.id ? 'white' : 'var(--text-secondary)', transition: 'all .15s',
          }}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
      background: 'var(--accent-glow)', color: 'var(--accent)',
    }}>{children}</span>
  )
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', fontSize: '0.83rem' }}>
      {ok
        ? <CheckCircle2 size={16} style={{ color: '#4bd68a', flexShrink: 0, marginTop: 2 }} />
        : <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />}
      <span style={{ color: ok ? 'var(--text)' : 'var(--danger)' }}>
        {label}{detail && <span style={{ color: 'var(--text-muted)' }}> · {detail}</span>}
      </span>
    </div>
  )
}

// ── Seite ─────────────────────────────────────────────────────────────────
export default function AbiPage() {
  const router = useRouter()
  const { years, selectedYear, loading } = useApp()

  const [mode, setMode] = useState<Mode>('app')
  const [appEntries, setAppEntries] = useState<Record<string, Cell>>({})
  const [manual, setManual] = useState<AbiSubject[]>(() => DEFAULT_MANUAL.map(makeManual))
  const [exam, setExam] = useState<ExamState>(EMPTY_EXAM)
  const [target, setTarget] = useState('1,5')
  const [goalOn, setGoalOn] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [hydrated, setHydrated] = useState(false)

  const group = useMemo(() => {
    if (!selectedYear?.isOberstufe) return []
    return selectedYear.groupId
      ? years.filter(y => y.isOberstufe && y.groupId === selectedYear.groupId)
      : [selectedYear]
  }, [years, selectedYear])
  const hasApp = group.length > 0
  const storeKey = `notafix-abi-v1:${selectedYear?.groupId ?? 'manual'}`

  // Laden / Speichern (lokal im Browser, pro Oberstufe)
  useEffect(() => {
    if (loading) return
    setHydrated(false)
    try {
      const raw = localStorage.getItem(storeKey)
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>
        setMode(p.mode === 'manual' || !hasApp ? 'manual' : 'app')
        setAppEntries(p.appEntries ?? {})
        if (p.manual?.length) setManual(p.manual)
        setExam(p.exam ?? EMPTY_EXAM)
        setTarget(p.target ?? '1,5')
        setGoalOn(!!p.goalOn)
      } else {
        setMode(hasApp ? 'app' : 'manual')
      }
    } catch { setMode(hasApp ? 'app' : 'manual') }
    setHydrated(true)
  }, [loading, storeKey, hasApp])

  useEffect(() => {
    if (!hydrated) return
    try {
      const data: Persisted = { mode, appEntries, manual, exam, target, goalOn }
      localStorage.setItem(storeKey, JSON.stringify(data))
    } catch { /* Speicher voll / blockiert – ignorieren */ }
  }, [hydrated, storeKey, mode, appEntries, manual, exam, target, goalOn])

  // Fächer aus der App (alle 4 Oberstufen-Halbjahre derselben Gruppe)
  const appSubjects: AbiSubject[] = useMemo(() => {
    const map = new Map<string, { label: string; isLK: boolean }>()
    for (const y of [...group].sort((a, b) => (a.semester ?? 0) - (b.semester ?? 0))) {
      for (const s of y.subjects) {
        const label = (s.customName || s.name).trim()
        const k = subjectKey(label)
        const prev = map.get(k)
        map.set(k, { label: prev?.label ?? label, isLK: (prev?.isLK ?? false) || s.isLeistungskurs === true })
      }
    }
    return Array.from(map.entries()).map(([key, info]) => {
      const cells: Cell[] = []
      const locked: boolean[] = []
      for (let sem = 1; sem <= 4; sem++) {
        const y = group.find(g => g.semester === sem)
        let base: Cell = null
        let isLocked = false
        if (y) {
          const subj = y.subjects.find(s => subjectKey(s.customName || s.name) === key)
          if (!subj) base = 'x'
          else {
            const avg = calculateSubjectAverage(subj.grades, subj.categories, null, subj.examWeight, subj.otherWeight)
            if (avg !== null) { base = Math.min(15, Math.max(0, Math.round(avg))); isLocked = true }
          }
        }
        const entry = appEntries[`${key}|${sem - 1}`]
        cells.push(isLocked ? base : entry !== undefined ? entry : base)
        locked.push(isLocked)
      }
      return { key, label: info.label, isLK: info.isLK, cells, locked }
    })
  }, [group, appEntries])

  const subjects = mode === 'app' ? appSubjects : manual

  // Prüfungsfächer: nur gültige Fächer behalten
  const examSafe: ExamState = useMemo(() => ({
    keys: exam.keys.map(k => (k && subjects.some(s => s.key === k && !s.isLK) ? k : null)),
    points: exam.points,
  }), [exam, subjects])

  // ── Berechnungen ────────────────────────────────────────────────────────
  const targetNum = useMemo(() => {
    const n = parseFloat(target.replace(',', '.'))
    return isNaN(n) ? null : Math.min(4, Math.max(1, Math.round(n * 10) / 10))
  }, [target])

  const forecast = useMemo(() => forecastFill(subjects, examSafe), [subjects, examSafe])
  const cur = useMemo(() => evaluate(subjects, examSafe, forecast), [subjects, examSafe, forecast])
  const best = useMemo(() => evaluate(subjects, examSafe, () => 15), [subjects, examSafe])
  const worst = useMemo(() => evaluate(subjects, examSafe, () => 0), [subjects, examSafe])
  const open = useMemo(() => openKeys(subjects, examSafe).length, [subjects, examSafe])
  const goal = useMemo(
    () => (goalOn && targetNum !== null && subjects.length ? solveGoal(subjects, examSafe, targetNum) : null),
    [goalOn, targetNum, subjects, examSafe]
  )
  const withGoal = useMemo(
    () => (goal ? evaluate(subjects, examSafe, k => goal.fill[k] ?? 0) : null),
    [goal, subjects, examSafe]
  )

  // ── Änderungen ──────────────────────────────────────────────────────────
  function setCell(sKey: string, i: number, val: Cell) {
    if (mode === 'app') setAppEntries(p => ({ ...p, [`${sKey}|${i}`]: val }))
    else setManual(p => p.map(s => s.key === sKey ? { ...s, cells: s.cells.map((c, j) => (j === i ? val : c)) } : s))
  }

  function toggleLK(sKey: string) {
    setManual(p => {
      const t = p.find(s => s.key === sKey)
      if (!t) return p
      if (!t.isLK && p.filter(s => s.isLK).length >= 2) return p
      return p.map(s => s.key === sKey ? { ...s, isLK: !s.isLK } : s)
    })
    setExam(e => ({ ...e, keys: e.keys.map(k => (k === sKey ? null : k)) }))
  }

  function addManualSubject() {
    const label = newSubject.trim()
    if (!label || manual.some(s => s.key === subjectKey(label))) return
    setManual(p => [...p, makeManual(label)])
    setNewSubject('')
  }

  function removeManualSubject(sKey: string) {
    setManual(p => p.filter(s => s.key !== sKey))
    setExam(e => ({ ...e, keys: e.keys.map(k => (k === sKey ? null : k)) }))
  }

  function setExamPoints(i: number, v: number | null) {
    setExam(e => ({ ...e, points: e.points.map((p, j) => (j === i ? v : p)) }))
  }

  function setExamKey(j: number, k: string) {
    setExam(e => ({ ...e, keys: e.keys.map((x, i) => (i === j ? (k || null) : x)) }))
  }

  function commitGoal() {
    if (!goal) return
    const examPts = [...exam.points]
    const cellUpdates: Record<string, number> = {}
    for (const [k, v] of Object.entries(goal.fill)) {
      if (k.startsWith('exam|')) examPts[Number(k.split('|')[1])] = v
      else cellUpdates[k] = v
    }
    setExam(e => ({ ...e, points: examPts }))
    if (mode === 'app') {
      setAppEntries(p => ({ ...p, ...cellUpdates }))
    } else {
      setManual(p => p.map(s => ({
        ...s,
        cells: s.cells.map((c, i) => (c === null && cellUpdates[`${s.key}|${i}`] !== undefined ? cellUpdates[`${s.key}|${i}`] : c)),
      })))
    }
    setGoalOn(false)
  }

  function resetEntries() {
    if (!window.confirm('Alle selbst eingetragenen Werte und Prüfungsfächer zurücksetzen? Noten aus der App bleiben erhalten.')) return
    setAppEntries({})
    setExam(EMPTY_EXAM)
    setGoalOn(false)
    if (mode === 'manual') setManual(p => p.map(s => ({ ...s, cells: [null, null, null, null] })))
  }

  if (loading || !hydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  const lkSubjects = subjects.filter(s => s.isLK).slice(0, 2)
  const gkSubjects = subjects.filter(s => !lkSubjects.includes(s))
  const resultColor = getGradeColor(cur.total / 60, true)
  const showContent = mode === 'manual' || hasApp

  return (
    <div className="page">
      <header className="page-header">
        <button
          className="btn-add"
          onClick={() => router.push('/half/1')}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Abirechner Sachsen</h1>
        <button
          className="btn-add"
          onClick={resetEntries}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Eingaben zurücksetzen"
        >
          <RotateCcw size={18} />
        </button>
      </header>

      <div className="page-content" style={{ paddingBottom: 110 }}>
        {/* ── Modus ─────────────────────────────────────────────────────── */}
        <Segment<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { id: 'app', label: 'Aus der App', icon: <Smartphone size={15} /> },
            { id: 'manual', label: 'Manuell', icon: <PenLine size={15} /> },
          ]}
        />

        {mode === 'app' && !hasApp && (
          <div style={{ ...card, textAlign: 'center' }}>
            <GraduationCap size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Für die App-Noten wähle im Halbjahr-Tab eine <b>Oberstufe</b> (z. B. 11/1) aus oder lege sie neu an.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setMode('manual')}>Manuell eintragen</button>
          </div>
        )}

        {mode === 'app' && hasApp && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 4px 4px' }}>
            {selectedYear?.groupName ?? selectedYear?.name}: Halbjahresnoten und Leistungskurse stammen aus deiner App
            (Punkte gerundet). Offene Felder kannst du selbst befüllen.
            {' '}Halbjahre in der App: {group.map(g => OBERSTUFE_SEMESTERS.find(s => s.semester === g.semester)?.label).filter(Boolean).join(', ') || '–'}
          </p>
        )}

        {showContent && (
          <>
            {/* ── Fächer & Halbjahresnoten ──────────────────────────────── */}
            <h2 style={sectionTitle}>Fächer & Halbjahresnoten</h2>
            {subjects.length === 0 && (
              <div style={card}><p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Keine Fächer vorhanden.</p></div>
            )}
            {[...lkSubjects, ...gkSubjects].map(s => (
              <div key={s.key} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, flex: 1, fontSize: '0.95rem' }}>{s.label}</span>
                  {mode === 'manual' ? (
                    <button
                      onClick={() => toggleLK(s.key)}
                      style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        background: s.isLK ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: s.isLK ? 'white' : 'var(--text-secondary)',
                        border: '1px solid ' + (s.isLK ? 'var(--accent)' : 'var(--border)'),
                      }}
                    >LK</button>
                  ) : s.isLK ? <Pill>Leistungskurs · zählt doppelt</Pill> : null}
                  {mode === 'manual' && (
                    <button onClick={() => removeManualSubject(s.key)} style={{ color: 'var(--text-muted)', padding: 4 }} title="Fach entfernen">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {OBERSTUFE_SEMESTERS.map((sem, i) => {
                    const c = s.cells[i]
                    const key = `${s.key}|${i}`
                    const dim = !s.isLK && typeof c === 'number' && !cur.selected.has(key)
                    return (
                      <div key={sem.semester}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 3 }}>{sem.label}</div>
                        {s.locked[i] && typeof c === 'number' ? (
                          <div
                            title="Aus der App"
                            style={{
                              ...selectBase, cursor: 'default', fontWeight: 700,
                              color: getGradeColor(c, true), opacity: dim ? 0.45 : 1,
                              borderColor: 'var(--border-strong)',
                            }}
                          >{c}</div>
                        ) : (
                          <PointSelect
                            value={c}
                            suggestion={goal?.fill[key]}
                            allowX
                            dim={dim}
                            onChange={v => setCell(s.key, i, v)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {mode === 'manual' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input
                  className="form-input"
                  placeholder="Fach hinzufügen …"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addManualSubject() }}
                />
                <button className="btn-add" onClick={addManualSubject} title="Hinzufügen"><Plus size={20} /></button>
              </div>
            )}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 4px 0' }}>
              Abgeblendete Kurse werden bei der besten Einbringung nicht gewertet. „✕ nicht belegt“ für Halbjahre ohne das Fach.
            </p>

            {/* ── Prüfungsfächer ────────────────────────────────────────── */}
            <h2 style={sectionTitle}>Abiturprüfungen (Block II)</h2>
            <div style={card}>
              {EXAM_LABELS.map((label, i) => {
                const isLKSlot = i < 2
                const lkSub = isLKSlot ? lkSubjects[i] : null
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 74px', gap: 8, alignItems: 'end', marginBottom: i < 4 ? 12 : 0 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                      {isLKSlot ? (
                        <div style={{ ...selectBase, textAlign: 'left', padding: '8px 10px', fontFamily: 'inherit', color: lkSub ? 'var(--text)' : 'var(--text-muted)' }}>
                          {lkSub ? lkSub.label : 'Kein Leistungskurs gewählt'}
                        </div>
                      ) : (
                        <select
                          value={examSafe.keys[i - 2] ?? ''}
                          onChange={e => setExamKey(i - 2, e.target.value)}
                          style={{ ...selectBase, textAlign: 'left', textAlignLast: 'left', padding: '8px 10px', fontFamily: 'inherit' }}
                        >
                          <option value="">Fach wählen …</option>
                          {gkSubjects.map(g => (
                            <option key={g.key} value={g.key} disabled={examSafe.keys.some((k, j) => k === g.key && j !== i - 2)}>{g.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3, textAlign: 'center' }}>Punkte</div>
                      <PointSelect
                        value={exam.points[i]}
                        suggestion={goal?.fill[`exam|${i}`]}
                        onChange={v => setExamPoints(i, typeof v === 'number' ? v : null)}
                      />
                    </div>
                  </div>
                )
              })}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 12 }}>
                Die Prüfungsfächer 1 und 2 sind deine Leistungskurse. Prüfungspunkte zählen vierfach.
              </p>
              <div style={{ marginTop: 8 }}>
                {cur.requirements.slice(0, 5).map(c => <CheckRow key={c.label} ok={c.ok} label={c.label} detail={c.detail} />)}
              </div>
            </div>

            {/* ── Zielschnitt ───────────────────────────────────────────── */}
            <h2 style={sectionTitle}>Zielschnitt</h2>
            <div style={card}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Target size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <input
                  className="form-input"
                  inputMode="decimal"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  style={{ maxWidth: 90, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                  aria-label="Zielschnitt"
                />
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  disabled={targetNum === null || open === 0}
                  onClick={() => setGoalOn(true)}
                >
                  <Wand2 size={16} /> Punkte verteilen
                </button>
              </div>
              {open === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>Es gibt keine offenen Felder mehr.</p>}

              {goal && targetNum !== null && (
                <div style={{ marginTop: 14 }}>
                  {goal.reachable ? (
                    <>
                      <p style={{ fontSize: '0.88rem' }}>
                        Für einen Schnitt von <b>{fmtGrade(targetNum)}</b> brauchst du mindestens <b>{goal.needed} Punkte</b>.
                        Die {goal.openCount} offenen Felder sind oben (gestrichelt) gleichmäßig aufgefüllt:
                        Ergebnis <b>{withGoal?.total} P. ≙ {fmtGrade(withGoal?.grade ?? null)}</b>.
                      </p>
                      {withGoal?.grade != null && withGoal.grade < targetNum - 0.05 && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          Besser als das Ziel, weil zum Bestehen Mindestpunkte nötig sind (z. B. in 3 Prüfungen mind. 5 P.).
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: '0.88rem', color: 'var(--danger)' }}>
                      Dieser Schnitt ist mit deinen bisherigen Noten nicht mehr erreichbar. Maximal möglich:
                      <b> {fmtGrade(best.grade)}</b> ({best.total} P.).
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setGoalOn(false)}>Ausblenden</button>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={commitGoal}
                    >
                      <Check size={16} /> Übernehmen
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Ergebnis ──────────────────────────────────────────────── */}
            <h2 style={sectionTitle}>Dein Abischnitt</h2>
            <div style={{ ...card, textAlign: 'center', padding: '24px 16px' }}>
              <div
                className="average-circle large"
                style={{
                  width: 190, height: 190, margin: '0 auto',
                  backgroundColor: cur.grade === null ? 'var(--color-neutral)' : resultColor,
                  boxShadow: `0 0 60px ${cur.grade === null ? '#555570' : resultColor}60`,
                }}
              >
                <span className="value" style={{ fontSize: '3.4rem' }}>{fmtGrade(cur.grade)}</span>
                <span className="label" style={{ fontSize: '0.75rem' }}>{cur.total} / 900 Punkte</span>
              </div>

              <p style={{ marginTop: 16, fontSize: '0.85rem', fontWeight: 600, color: cur.passed ? '#4bd68a' : 'var(--danger)' }}>
                {cur.passed ? 'Bestanden' : 'Nach aktuellem Stand nicht bestanden'}
              </p>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {open === 0
                  ? 'Alle Felder ausgefüllt – das ist dein Endergebnis.'
                  : `Prognose: ${open} offene Felder sind mit deinem bisherigen Schnitt ergänzt.`}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Block I · Kurse</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cur.block1} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ 600</span></div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Block II · Prüfungen</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cur.block2} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ 300</span></div>
                </div>
              </div>

              {withGoal && (
                <p style={{ fontSize: '0.8rem', marginTop: 12, color: 'var(--accent)' }}>
                  Mit Ziel-Verteilung: <b>{fmtGrade(withGoal.grade)}</b> ({withGoal.total} P.)
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <TrendingUp size={15} style={{ color: '#4bd68a' }} /> Bestmöglich
                </div>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4 }}>{fmtGrade(best.grade)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{best.total} P. · offene Felder = 15</div>
              </div>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <TrendingDown size={15} style={{ color: 'var(--danger)' }} /> Schlechtestmöglich
                </div>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 4 }}>{fmtGrade(worst.grade)}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {worst.total} P. · offene Felder = 0{worst.passed ? '' : ' · nicht bestanden'}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>Bestehensbedingungen (aktueller Stand)</div>
              {cur.passing.map(c => <CheckRow key={c.label} ok={c.ok} label={c.label} detail={c.detail} />)}
              {cur.requirements.slice(5).map(c => <CheckRow key={c.label} ok={c.ok} label={c.label} detail={c.detail} />)}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
                Block I: 8 LK-Halbjahre (doppelt = 16) + 24 Grundkurs-Halbjahre = 40 Kurse; die Einbringung der
                Grundkurse wird automatisch optimal gewählt. Ergebnis ohne Gewähr – maßgeblich sind die Angaben deiner Schule.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
