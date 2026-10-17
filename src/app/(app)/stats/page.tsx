'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/components/AppProvider'
import YearDropdown from '@/components/layout/YearDropdown'
import { BarChart2 } from 'lucide-react'

type FilterMode = 'all' | '1' | '2'

export default function StatsPage() {
  const { years, selectedYearId, selectedYear, loading, selectYear, deleteYear } = useApp()
  const [filter, setFilter] = useState<FilterMode>('all')

  const isOberstufe = selectedYear?.isOberstufe ?? false
  const pointSystem = isOberstufe || (selectedYear?.pointSystem ?? false)

  // Oberstufe hat nur ein Halbjahr → kein Halbjahr-Filter
  useEffect(() => { if (isOberstufe) setFilter('all') }, [isOberstufe])

  // Alle Noten sammeln, nach Halbjahr filtern
  const allGrades = useMemo(() => {
    if (!selectedYear) return []
    return selectedYear.subjects.flatMap(s =>
      s.grades.filter(g => filter === 'all' || g.half === Number(filter))
    )
  }, [selectedYear, filter])

  // Für Notensystem 1–6: Noten 1,2,3,4,5,6 zählen (ohne Modifier)
  // Für Punktesystem 0–15: Gruppen 13–15, 10–12, 7–9, 4–6, 1–3, 0
  const bars = useMemo(() => {
    if (pointSystem) {
      const groups = [
        { label: '13–15', min: 13, max: 15, color: '#4bff9a' },
        { label: '10–12', min: 10, max: 12, color: '#8bff6b' },
        { label: '7–9',   min: 7,  max: 9,  color: '#ffd93d' },
        { label: '4–6',   min: 4,  max: 6,  color: '#ff9a3d' },
        { label: '1–3',   min: 1,  max: 3,  color: '#ff6b6b' },
        { label: '0',     min: 0,  max: 0,  color: '#ff3d3d' },
      ]
      return groups.map(g => ({
        label: g.label,
        count: allGrades.filter(gr => gr.value >= g.min && gr.value <= g.max).length,
        color: g.color,
      }))
    } else {
      const gradeColors: Record<number, string> = {
        1: '#4bff9a',
        2: '#8bff6b',
        3: '#ffd93d',
        4: '#ff9a3d',
        5: '#ff6b6b',
        6: '#ff3d3d',
      }
      return [1, 2, 3, 4, 5, 6].map(v => ({
        label: String(v),
        count: allGrades.filter(g => g.value === v).length,
        color: gradeColors[v],
      }))
    }
  }, [allGrades, pointSystem])

  const maxCount = Math.max(...bars.map(b => b.count), 1)
  const totalGrades = allGrades.length

  // Durchschnitt
  const avg = useMemo(() => {
    if (allGrades.length === 0) return null
    return Math.round(allGrades.reduce((s, g) => s + g.value, 0) / allGrades.length * 100) / 100
  }, [allGrades])

  // Häufigste Note
  const mostCommon = useMemo(() => {
    if (bars.length === 0) return null
    return bars.reduce((a, b) => b.count > a.count ? b : a)
  }, [bars])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  )

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
            color: 'white', flexShrink: 0,
          }}>NF</div>
          <YearDropdown
            years={years}
            selectedYearId={selectedYearId}
            onSelect={selectYear}
            onDelete={deleteYear}
          />
        </div>
      </header>

      <div className="page-content">
        {!selectedYearId ? (
          <div className="empty-state">
            <h3>Kein Schuljahr ausgewählt</h3>
            <p>Wähle ein Schuljahr oben links</p>
          </div>
        ) : (
          <>
            {/* Halbjahr-Filter */}
            {!isOberstufe && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {([['all', 'Gesamt'], ['1', '1. Halbjahr'], ['2', '2. Halbjahr']] as [FilterMode, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilter(val)}
                    style={{
                      padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: filter === val ? 'var(--accent)' : 'var(--bg-card)',
                      color: filter === val ? 'white' : 'var(--text-secondary)',
                      border: filter === val ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {totalGrades === 0 ? (
              <div className="empty-state">
                <BarChart2 size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <h3>Keine Noten vorhanden</h3>
                <p>Trage Noten ein um das Diagramm zu sehen</p>
              </div>
            ) : (
              <>
                {/* Statistik-Karten */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px',
                    border: '1px solid var(--border)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{totalGrades}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>Noten gesamt</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px',
                    border: '1px solid var(--border)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {avg ?? '–'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>Ø Durchschnitt</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: '14px 12px',
                    border: '1px solid var(--border)', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '1.5rem', fontWeight: 800,
                      color: mostCommon && mostCommon.count > 0 ? mostCommon.color : 'var(--text-muted)',
                    }}>
                      {mostCommon && mostCommon.count > 0 ? mostCommon.label : '–'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>Häufigste Note</div>
                  </div>
                </div>

                {/* Balkendiagramm */}
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 18, padding: '24px 20px 16px',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
                    Notenverteilung · {selectedYear?.name}
                  </p>

                  {/* Balken */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 230, paddingBottom: 0, paddingTop: 24, }}>
                    {bars.map(bar => {
                      const heightPct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0
                      const barH = Math.max(heightPct * 1.6, bar.count > 0 ? 6 : 0)
                      return (
                        <div key={bar.label} style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end',
                        }}>
                          {/* Zahl oben */}
                          <span style={{
                            fontSize: '0.8rem', fontWeight: 700,
                            color: bar.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                            minHeight: 20, display: 'flex', alignItems: 'flex-end',
                          }}>
                            {bar.count > 0 ? bar.count : ''}
                          </span>

                          {/* Balken */}
                          <div style={{
                            width: '100%', height: `${barH}px`,
                            background: bar.count > 0
                              ? `linear-gradient(180deg, ${bar.color}cc, ${bar.color}88)`
                              : 'var(--bg)',
                            borderRadius: '6px 6px 4px 4px',
                            border: bar.count > 0 ? `1px solid ${bar.color}66` : '1px solid var(--border)',
                            transition: 'height 0.4s ease',
                            minHeight: 4,
                            position: 'relative',
                            boxShadow: bar.count > 0 ? `0 0 12px ${bar.color}33` : 'none',
                          }} />
                        </div>
                      )
                    })}
                  </div>

                  {/* X-Achse Labels */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {bars.map(bar => (
                      <div key={bar.label} style={{
                        flex: 1, textAlign: 'center',
                        fontSize: '0.8rem', fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}>
                        {bar.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fach-Übersicht */}
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 12 }}>
                    Nach Fach
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedYear?.subjects
                      .map(s => ({
                        name: s.customName || s.name,
                        grades: s.grades.filter(g => filter === 'all' || g.half === Number(filter)),
                      }))
                      .filter(s => s.grades.length > 0)
                      .sort((a, b) => b.grades.length - a.grades.length)
                      .map(s => {
                        const subjectAvg = Math.round(s.grades.reduce((sum, g) => sum + g.value, 0) / s.grades.length * 10) / 10
                        const pct = (s.grades.length / totalGrades) * 100
                        return (
                          <div key={s.name} style={{
                            background: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px',
                            border: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{s.name}</span>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  Ø {subjectAvg}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {s.grades.length} Note{s.grades.length !== 1 ? 'n' : ''}
                                </span>
                              </div>
                            </div>
                            {/* Mini-Fortschrittsbalken */}
                            <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`,
                                background: 'var(--accent)', borderRadius: 2,
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
