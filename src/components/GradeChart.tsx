'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { SchoolYear } from '@/types'

interface GradeChartProps {
  year: SchoolYear
  pointSystem: boolean
  onClose: () => void
}

export default function GradeChart({ year, pointSystem, onClose }: GradeChartProps) {
  const { counts, total, maxCount, labels } = useMemo(() => {
    const allGrades = year.subjects.flatMap(s => s.grades)

    if (pointSystem) {
      // Punkte 0–15 in Gruppen: 0-3, 4-6, 7-9, 10-12, 13-15
      const groups = [
        { label: '0–3', min: 0, max: 3 },
        { label: '4–6', min: 4, max: 6 },
        { label: '7–9', min: 7, max: 9 },
        { label: '10–12', min: 10, max: 12 },
        { label: '13–15', min: 13, max: 15 },
      ]
      const counts = groups.map(g =>
        allGrades.filter(grade => grade.value >= g.min && grade.value <= g.max).length
      )
      const total = allGrades.length
      const maxCount = Math.max(...counts, 1)
      return { counts, total, maxCount, labels: groups.map(g => g.label) }
    } else {
      // Noten 1–6
      const labels = ['1', '2', '3', '4', '5', '6']
      const counts = [1, 2, 3, 4, 5, 6].map(n =>
        allGrades.filter(g => g.value === n).length
      )
      const total = allGrades.length
      const maxCount = Math.max(...counts, 1)
      return { counts, total, maxCount, labels }
    }
  }, [year, pointSystem])

  // Farben pro Note/Gruppe
  const colors = pointSystem
    ? ['#e05c5c', '#e08c3c', '#e0c03c', '#7ec86e', '#4caf7d']
    : ['#4caf7d', '#7ec86e', '#c8d45a', '#e0c03c', '#e08c3c', '#e05c5c']

  const barMaxHeight = 160

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ borderRadius: 'var(--radius)', paddingBottom: 0, maxWidth: 480, width: '95%' }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Notenverteilung</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {year.name} · {total} {total === 1 ? 'Note' : 'Noten'} gesamt
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ paddingBottom: 28 }}>
          {total === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text-muted)', fontSize: '0.9rem',
            }}>
              Noch keine Noten eingetragen.
            </div>
          ) : (
            <>
              {/* Balkendiagramm */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: pointSystem ? 12 : 16,
                height: barMaxHeight + 48,
                padding: '0 8px',
                marginBottom: 20,
              }}>
                {labels.map((label, i) => {
                  const count = counts[i]
                  const barHeight = count === 0 ? 0 : Math.max(8, Math.round((count / maxCount) * barMaxHeight))
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0

                  return (
                    <div
                      key={label}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 6, flex: 1,
                      }}
                    >
                      {/* Zahl oben */}
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 700,
                        color: count === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                        minHeight: 20, display: 'flex', alignItems: 'flex-end',
                        height: barMaxHeight - barHeight + 20,
                      }}>
                        {count > 0 ? count : ''}
                      </span>

                      {/* Balken */}
                      <div
                        style={{
                          width: '100%',
                          height: barHeight,
                          minHeight: count === 0 ? 0 : 8,
                          background: count === 0 ? 'var(--border)' : colors[i],
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.4s ease',
                          position: 'relative',
                          cursor: count > 0 ? 'default' : 'default',
                        }}
                      />

                      {/* Label unten */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      }}>
                        <span style={{
                          fontSize: pointSystem ? '0.72rem' : '1rem',
                          fontWeight: 700,
                          color: count === 0 ? 'var(--text-muted)' : colors[i],
                        }}>
                          {label}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {count > 0 ? `${pct}%` : '–'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Zusammenfassung */}
              <div style={{
                display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
              }}>
                {[
                  { label: 'Gesamt', value: total },
                  { label: 'Häufigste', value: (() => {
                    const maxIdx = counts.indexOf(Math.max(...counts))
                    return counts[maxIdx] > 0 ? `Note ${labels[maxIdx]}` : '–'
                  })() },
                  { label: 'Ø Note', value: (() => {
                    const allGrades = year.subjects.flatMap(s => s.grades)
                    if (allGrades.length === 0) return '–'
                    const avg = allGrades.reduce((s, g) => s + g.value, 0) / allGrades.length
                    return pointSystem
                      ? `${avg.toFixed(1)} P`
                      : avg.toFixed(1)
                  })() },
                ].map(stat => (
                  <div key={stat.label} style={{
                    flex: 1, minWidth: 90,
                    background: 'var(--bg-card)', borderRadius: 10,
                    padding: '10px 14px', textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
