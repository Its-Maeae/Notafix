'use client'

import { Trash2 } from 'lucide-react'
import { Subject } from '@/types'
import { getGradeColor, calculateSubjectAverage, formatGrade } from '@/lib/grades'
import AverageCircle from '@/components/ui/AverageCircle'

interface SubjectCardProps {
  subject: Subject
  half: number | null
  pointSystem?: boolean
  onClick: () => void
  onDelete?: (e: React.MouseEvent) => void
}

export default function SubjectCard({ subject, half, pointSystem = false, onClick, onDelete }: SubjectCardProps) {
  const avg = calculateSubjectAverage(
    subject.grades, subject.categories, half, subject.examWeight, subject.otherWeight
  )

  const filteredGrades = half !== null
    ? subject.grades.filter(g => g.half === half)
    : subject.grades

  return (
    <div className="subject-card" onClick={onClick}>
      <div className="subject-card-header">
        <span className="subject-name">
          {subject.customName || subject.name}
          {subject.isLeistungskurs && (
            <span style={{
              marginLeft: 8, padding: '2px 7px', borderRadius: 999, fontSize: '0.65rem',
              fontWeight: 700, verticalAlign: 'middle', letterSpacing: '0.04em',
              background: 'rgba(255,180,0,0.15)', color: '#ffb400', border: '1px solid rgba(255,180,0,0.4)',
            }}>LK</span>
          )}
        </span>

        {/* Rechte Seite: Papierkorb + Durchschnitt */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(e) }}
              style={{
                padding: '6px', background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6,
                display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Fach löschen"
            >
              <Trash2 size={15} />
            </button>
          )}
          <AverageCircle average={avg} size="small" pointSystem={pointSystem} />
        </div>
      </div>

      {filteredGrades.length > 0 && (
        <div className="subject-grades-preview">
          {filteredGrades.slice(0, 10).map(g => {
            const color = getGradeColor(g.value, pointSystem)
            return (
              <div
                key={g.id}
                className="grade-chip"
                style={{ backgroundColor: color }}
                title={g.type === 'exam' ? 'Klassenarbeit' : 'Sonstige Note'}
              >
                {formatGrade(g.value, g.modifier, pointSystem)}
              </div>
            )
          })}
          {filteredGrades.length > 10 && (
            <div
              className="grade-chip"
              style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}
            >
              +{filteredGrades.length - 10}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
