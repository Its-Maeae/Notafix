'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, AlignLeft, ArrowUpDown, AlertTriangle, BarChart2 } from 'lucide-react'
import { useApp } from '@/components/AppProvider'
import AverageCircle from '@/components/ui/AverageCircle'
import { useOberstufeRedirect } from '@/components/useOberstufeRedirect'
import YearDropdown from '@/components/layout/YearDropdown'
import SubjectCard from '@/components/subjects/SubjectCard'
import SubjectModal from '@/components/subjects/SubjectModal'
import AddSubjectModal from '@/components/subjects/AddSubjectModal'
import Toggle from '@/components/ui/Toggle'
import { Subject } from '@/types'
import GradeChart from '@/components/GradeChart'
import { calculateSubjectAverage } from '@/lib/grades'

type SortMode = 'default' | 'best' | 'worst' | 'alpha'

export default function FinalPage() {
  const {
    years,
    selectedYearId,
    selectedYear,
    settings,
    loading,
    selectYear,
    deleteYear,
    addSubject,
    deleteSubject,
    addGrade,
    deleteGrade,
    updateWeights,
    getFinalAverage,
    getHalfAverage,
    updateYearPointSystem,
  } = useApp()
  const redirecting = useOberstufeRedirect()

  // ── KRITISCHER FIX: ID statt Objekt speichern ──────────────────────────────
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)
  const [activeHalf, setActiveHalf] = useState<1 | 2>(1)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [showPointSystemWarning, setShowPointSystemWarning] = useState(false)

  const avg = getFinalAverage()
  const half1Avg = getHalfAverage(1)
  const half2Avg = getHalfAverage(2)
  const pointSystem = selectedYear?.pointSystem ?? false

  // Immer aktuelles Subject-Objekt live aus dem Store holen
  const activeSubject = activeSubjectId
    ? (selectedYear?.subjects.find(s => s.id === activeSubjectId) ?? null)
    : null

  function getSortedSubjects(subjects: Subject[]): Subject[] {
    if (sortMode === 'default') return subjects
    const withAvg = subjects.map(s => ({
      s,
      avg: calculateSubjectAverage(s.grades, s.categories, null, s.examWeight, s.otherWeight),
    }))
    if (sortMode === 'best') {
      return [...withAvg].sort((a, b) => {
        if (a.avg === null) return 1
        if (b.avg === null) return -1
        return pointSystem ? b.avg - a.avg : a.avg - b.avg
      }).map(x => x.s)
    }
    if (sortMode === 'worst') {
      return [...withAvg].sort((a, b) => {
        if (a.avg === null) return 1
        if (b.avg === null) return -1
        return pointSystem ? a.avg - b.avg : b.avg - a.avg
      }).map(x => x.s)
    }
    if (sortMode === 'alpha') {
      return [...subjects].sort((a, b) =>
        (a.customName || a.name).localeCompare(b.customName || b.name, 'de')
      )
    }
    return subjects
  }

  async function confirmPointSystemSwitch() {
    if (!selectedYearId) return
    await updateYearPointSystem(selectedYearId, !pointSystem, true)
    setShowPointSystemWarning(false)
  }

  if (redirecting) return null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }

  const sortedSubjects = getSortedSubjects(selectedYear?.subjects ?? [])

  const sortButtons: { mode: SortMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'default', label: 'Standard', icon: <AlignLeft size={13} /> },
    { mode: 'best', label: 'Bestes', icon: <ArrowUp size={13} /> },
    { mode: 'worst', label: 'Schlechtestes', icon: <ArrowDown size={13} /> },
    { mode: 'alpha', label: 'A–Z', icon: <ArrowUpDown size={13} /> },
  ]

  return (
    <div className="page">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontFamily: 'var(--font-mono)', fontWeight: 700,
            fontSize: '0.75rem', color: 'white', letterSpacing: '-0.03em',
          }}>
            NF
          </div>
          <YearDropdown
            years={years}
            selectedYearId={selectedYearId}
            onSelect={selectYear}
            onDelete={deleteYear}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-add"
            onClick={() => setShowChart(true)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Notenverteilung"
          >
            <BarChart2 size={20} />
          </button>
          <button className="btn-add" onClick={() => setShowAddSubject(true)}>
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="page-hero">
        <AverageCircle average={avg} size="medium" pointSystem={pointSystem} showLabel />
        <p className="year-label">{selectedYear?.name ?? 'Kein Schuljahr'} • Endnote</p>

        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <AverageCircle average={half1Avg} size="small" pointSystem={pointSystem} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>1. HJ</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <AverageCircle average={half2Avg} size="small" pointSystem={pointSystem} />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>2. HJ</p>
          </div>
        </div>

        {selectedYearId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}
            onClick={() => setShowPointSystemWarning(true)}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              {pointSystem ? 'Punkte 0–15' : 'Noten 1–6'}
            </span>
            <Toggle checked={pointSystem} onChange={() => setShowPointSystemWarning(true)} />
          </div>
        )}
      </div>

      <div className="page-content">
        {!selectedYearId ? (
          <div className="empty-state">
            <h3>Kein Schuljahr ausgewählt</h3>
          </div>
        ) : selectedYear?.subjects.length === 0 ? (
          <div className="empty-state">
            <h3>Noch keine Fächer</h3>
            <p>Tippe auf + um ein Fach hinzuzufügen</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {sortButtons.map(btn => (
                <button
                  key={btn.mode}
                  onClick={() => setSortMode(btn.mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: sortMode === btn.mode ? 'var(--accent)' : 'var(--bg-card)',
                    color: sortMode === btn.mode ? 'white' : 'var(--text-secondary)',
                    border: sortMode === btn.mode ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  half={null}
                  pointSystem={pointSystem}
                  onClick={() => { setActiveSubjectId(subject.id); setActiveHalf(1) }}
                  onDelete={(e) => { e.stopPropagation(); setConfirmDeleteSubjectId(subject.id) }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {activeSubject && (
        <SubjectModal
          subject={activeSubject}
          half={activeHalf}
          showHalfSwitch
          pointSystem={pointSystem}
          onClose={() => setActiveSubjectId(null)}
          onAddGrade={addGrade}
          onDeleteGrade={deleteGrade}
          onUpdateWeights={updateWeights}
        />
      )}

      {showAddSubject && (
        <AddSubjectModal onClose={() => setShowAddSubject(false)} onAdd={addSubject} />
      )}

      {confirmDeleteSubjectId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteSubjectId(null)} style={{ alignItems: 'center' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderRadius: 'var(--radius)', paddingBottom: 0, maxWidth: 360 }}>
            <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
              <Trash2 size={36} style={{ color: 'var(--danger)', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Fach löschen?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.88rem' }}>
                Alle Noten dieses Fachs werden unwiderruflich gelöscht.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDeleteSubjectId(null)}>Abbrechen</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { deleteSubject(confirmDeleteSubjectId); setConfirmDeleteSubjectId(null) }}>Löschen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPointSystemWarning && (
        <div className="modal-overlay" onClick={() => setShowPointSystemWarning(false)} style={{ alignItems: 'center' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderRadius: 'var(--radius)', paddingBottom: 0, maxWidth: 400 }}>
            <div className="modal-body" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,165,0,0.15)', border: '2px solid rgba(255,165,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertTriangle size={28} style={{ color: '#ffaa00' }} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Notensystem wechseln?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.88rem', lineHeight: 1.6 }}>
                Wechsel von <strong>{pointSystem ? 'Punkte (0–15)' : 'Noten (1–6)'}</strong> zu <strong>{pointSystem ? 'Noten (1–6)' : 'Punkte (0–15)'}</strong> für <strong>{selectedYear?.name}</strong>.
              </p>
              <p style={{
                color: '#ffaa00', marginBottom: 24, fontSize: '0.88rem', lineHeight: 1.6,
                background: 'rgba(255,165,0,0.08)', padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(255,165,0,0.25)',
              }}>
                ⚠️ Alle bereits eingetragenen Noten in diesem Schuljahr werden unwiderruflich gelöscht.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPointSystemWarning(false)}>Abbrechen</button>
                <button className="btn" style={{ flex: 1, background: '#ffaa00', color: 'white' }} onClick={confirmPointSystemSwitch}>Wechseln & löschen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}