'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Pencil, Check } from 'lucide-react'
import { Subject, Grade, GradeCategory } from '@/types'
import { calculateSubjectAverage, formatAverage } from '@/lib/grades'
import AverageCircle from '@/components/ui/AverageCircle'
import GradeSection from '@/components/grades/GradeSection'
import { useApp } from '@/components/AppProvider'

interface SubjectModalProps {
  subject: Subject
  half: number
  showHalfSwitch?: boolean
  pointSystem?: boolean
  onClose: () => void
  onAddGrade: (subjectId: string, type: string, value: number, modifier: string | null, half: number, categoryId?: string | null) => Promise<void>
  onDeleteGrade: (gradeId: string, subjectId: string) => Promise<void>
  onUpdateWeights: (subjectId: string, examWeight: number, otherWeight: number) => Promise<void>
}

export default function SubjectModal({
  subject,
  half: initialHalf,
  showHalfSwitch = false,
  pointSystem = false,
  onClose,
  onAddGrade,
  onDeleteGrade,
  onUpdateWeights,
}: SubjectModalProps) {
  const { addCategory, updateCategory, deleteCategory } = useApp()
  const [half, setHalf] = useState<number>(initialHalf)

  // ── KRITISCHER FIX: localGrades immer mit subject.grades synchronisieren ──
  // Wenn subject sich von außen ändert (z.B. nach deleteGrade im AppProvider),
  // wird localGrades sofort aktualisiert — kein veralteter State mehr.
  const [localGrades, setLocalGrades] = useState<Grade[]>(subject.grades)
  const [localCategories, setLocalCategories] = useState<GradeCategory[]>(subject.categories ?? [])

  useEffect(() => {
    setLocalGrades(subject.grades)
  }, [subject.grades])

  useEffect(() => {
    setLocalCategories(subject.categories ?? [])
  }, [subject.categories])

  const [editingWeights, setEditingWeights] = useState(false)
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries((subject.categories ?? []).map(c => [c.id, c.weight]))
  )

  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const avg = calculateSubjectAverage(localGrades, localCategories, half, subject.examWeight, subject.otherWeight)
  const totalWeight = localCategories.reduce((s, c) => s + (weights[c.id] ?? c.weight), 0)
  const weightValid = Math.round(totalWeight) === 100

  async function handleAddGrade(categoryId: string, value: number, modifier: string | null) {
    const cat = localCategories.find(c => c.id === categoryId)
    await onAddGrade(subject.id, cat?.name ?? 'other', value, modifier, half, categoryId)
    const tempGrade: Grade = {
      id: `temp-${Date.now()}`,
      value, modifier,
      type: cat?.name ?? 'other',
      subjectId: subject.id,
      categoryId,
      half,
      createdAt: new Date(),
    }
    setLocalGrades(prev => [...prev, tempGrade])
  }

  async function handleDeleteGrade(gradeId: string) {
    // Sofort optimistisch aus UI entfernen
    setLocalGrades(prev => prev.filter(g => g.id !== gradeId))
    // Dann API-Call — wenn er fehlschlägt, Note wieder einfügen
    try {
      await onDeleteGrade(gradeId, subject.id)
    } catch (err) {
      // Rollback: Note wieder anzeigen
      setLocalGrades(subject.grades)
      console.error('Fehler beim Löschen der Note:', err)
    }
  }

  async function handleSaveWeights() {
    if (!weightValid) return
    for (const cat of localCategories) {
      const newW = weights[cat.id] ?? cat.weight
      if (newW !== cat.weight) {
        await updateCategory(cat.id, subject.id, cat.name, newW)
      }
    }
    setLocalCategories(prev => prev.map(c => ({ ...c, weight: weights[c.id] ?? c.weight })))
    setEditingWeights(false)
  }

  async function handleSaveCatName(cat: GradeCategory) {
    if (!editingCatName.trim()) return
    await updateCategory(cat.id, subject.id, editingCatName.trim(), cat.weight)
    setLocalCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: editingCatName.trim() } : c))
    setEditingCatId(null)
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return

    const newCount = localCategories.length + 1
    const evenWeight = Math.floor(100 / newCount)
    const remainder = 100 - evenWeight * newCount

    const updatedWeights: Record<string, number> = {}
    localCategories.forEach((c, i) => {
      updatedWeights[c.id] = evenWeight + (i === 0 ? remainder : 0)
    })
    const newWeight = evenWeight

    const cat = await addCategory(subject.id, newCatName.trim(), newWeight)
    if (cat) {
      for (const c of localCategories) {
        const w = updatedWeights[c.id] ?? c.weight
        if (w !== c.weight) await updateCategory(c.id, subject.id, c.name, w)
      }
      setLocalCategories(prev => [
        ...prev.map(c => ({ ...c, weight: updatedWeights[c.id] ?? c.weight })),
        { ...cat, weight: newWeight },
      ])
      setWeights(prev => {
        const next = { ...prev, ...updatedWeights, [cat.id]: newWeight }
        return next
      })
    }
    setNewCatName('')
    setShowAddCat(false)
  }

  async function handleDeleteCategory(catId: string) {
    await deleteCategory(catId, subject.id)
    const remaining = localCategories.filter(c => c.id !== catId)

    if (remaining.length > 0) {
      const evenWeight = Math.floor(100 / remaining.length)
      const remainder = 100 - evenWeight * remaining.length
      const newWeights: Record<string, number> = {}
      remaining.forEach((c, i) => { newWeights[c.id] = evenWeight + (i === 0 ? remainder : 0) })
      for (const c of remaining) {
        await updateCategory(c.id, subject.id, c.name, newWeights[c.id])
      }
      setLocalCategories(remaining.map(c => ({ ...c, weight: newWeights[c.id] })))
      setWeights(newWeights)
    } else {
      setLocalCategories([])
      setWeights({})
    }
    setLocalGrades(prev => prev.map(g => g.categoryId === catId ? { ...g, categoryId: null } : g))
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center', paddingBottom: 0 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderRadius: 'var(--radius)', maxHeight: '85vh', paddingBottom: 0 }}>

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <AverageCircle average={avg} size="small" pointSystem={pointSystem} />
            <div>
              <h2 className="modal-title">{subject.customName || subject.name}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {half}. Halbjahr • Ø {formatAverage(avg, pointSystem)}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {showHalfSwitch && (
          <div style={{ display: 'flex', gap: 8, padding: '0 24px 12px' }}>
            {[1, 2].map(h => (
              <button
                key={h}
                onClick={() => setHalf(h)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer',
                  background: half === h ? 'var(--accent)' : 'var(--bg-card)',
                  color: half === h ? 'white' : 'var(--text-secondary)',
                  border: half === h ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                {h}. Halbjahr
              </button>
            ))}
          </div>
        )}

        <div className="modal-body" style={{ paddingBottom: 24 }}>

          {/* Category weight editor */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Kategorien & Gewichtung</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {editingWeights ? (
                  <>
                    <button
                      onClick={handleSaveWeights}
                      disabled={!weightValid}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                        background: weightValid ? 'var(--accent)' : 'var(--bg-card)',
                        color: weightValid ? 'white' : 'var(--text-muted)',
                        border: 'none', cursor: weightValid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <Check size={13} /> Speichern
                    </button>
                    <button onClick={() => { setEditingWeights(false); setWeights(Object.fromEntries(localCategories.map(c => [c.id, c.weight]))) }}
                      style={{ padding: '4px 10px', borderRadius: 8, fontSize: '0.78rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditingWeights(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <Pencil size={12} /> Gewichtung
                    </button>
                    <button onClick={() => setShowAddCat(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 8, fontSize: '0.78rem', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer' }}>
                      <Plus size={13} /> Kategorie
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Weight sum indicator */}
            {editingWeights && (
              <div style={{
                padding: '6px 12px', borderRadius: 8, marginBottom: 10, fontSize: '0.78rem',
                background: weightValid ? 'rgba(75,255,154,0.08)' : 'rgba(255,75,110,0.08)',
                border: `1px solid ${weightValid ? 'rgba(75,255,154,0.3)' : 'rgba(255,75,110,0.3)'}`,
                color: weightValid ? 'var(--success)' : 'var(--danger)',
              }}>
                Summe: {totalWeight}% {weightValid ? '✓' : `(muss 100% sein)`}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {localCategories.map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 10,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                }}>
                  {editingCatId === cat.id ? (
                    <input
                      autoFocus
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCatName(cat); if (e.key === 'Escape') setEditingCatId(null) }}
                      style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500 }}>{cat.name}</span>
                  )}

                  {editingWeights ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={weights[cat.id] ?? cat.weight}
                        min={0} max={100}
                        onChange={e => setWeights(prev => ({ ...prev, [cat.id]: Number(e.target.value) }))}
                        className="weight-input"
                        style={{ width: 52 }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>{cat.weight}%</span>
                  )}

                  {!editingWeights && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {editingCatId === cat.id ? (
                        <button onClick={() => handleSaveCatName(cat)}
                          style={{ padding: '3px 6px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                          <Check size={12} />
                        </button>
                      ) : (
                        <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                          style={{ padding: '3px 6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6 }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                          <Pencil size={13} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteCategory(cat.id)}
                        style={{ padding: '3px 6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showAddCat && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    autoFocus
                    placeholder="Kategoriename"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddCat(false) }}
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.82rem' }} onClick={() => setShowAddCat(false)}>Abbrechen</button>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: '0.82rem' }} onClick={handleAddCategory}>Hinzufügen</button>
                </div>
              </div>
            )}
          </div>

          {/* Grade sections per category */}
          {localCategories.map(cat => (
            <GradeSection
              key={cat.id}
              title={cat.name}
              weight={cat.weight}
              grades={localGrades}
              categoryId={cat.id}
              half={half}
              subjectId={subject.id}
              pointSystem={pointSystem}
              onAddGrade={(value, modifier) => handleAddGrade(cat.id, value, modifier)}
              onDeleteGrade={handleDeleteGrade}
            />
          ))}
        </div>
      </div>
    </div>
  )
}