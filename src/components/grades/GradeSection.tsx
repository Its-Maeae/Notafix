'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Grade } from '@/types'
import { getGradeColor, formatGrade } from '@/lib/grades'
import GradePicker from './GradePicker'

interface GradeSectionProps {
  title: string
  weight: number
  grades: Grade[]
  categoryId: string
  half: number
  subjectId: string
  pointSystem?: boolean
  onAddGrade: (value: number, modifier: string | null) => Promise<void>
  onDeleteGrade: (gradeId: string) => Promise<void>
}

export default function GradeSection({
  title,
  weight,
  grades,
  categoryId,
  half,
  pointSystem = false,
  onAddGrade,
  onDeleteGrade,
}: GradeSectionProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  const filtered = grades.filter(g => g.categoryId === categoryId && g.half === half)

  async function handleSelect(value: number, modifier: string | null) {
    setLoading(true)
    await onAddGrade(value, modifier)
    setLoading(false)
    setShowPicker(false)
  }

  return (
    <div className="grade-section">
      <div className="grade-section-header">
        <span className="grade-section-title">{title}</span>
        <span className="grade-section-weight">{weight}%</span>
      </div>

      <div className="grades-grid">
        {filtered.map(g => {
          const color = getGradeColor(g.value, pointSystem)
          return (
            <div key={g.id} className="grade-chip-wrapper">
              <div className="grade-chip" style={{ backgroundColor: color }}>
                {formatGrade(g.value, g.modifier, pointSystem)}
              </div>
              <button className="grade-chip-delete" onClick={() => onDeleteGrade(g.id)} title="Löschen">×</button>
            </div>
          )
        })}

        <button className="btn-add" onClick={() => setShowPicker(!showPicker)}>
          <Plus size={18} />
        </button>
      </div>

      {showPicker && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Note auswählen</span>
            <button className="modal-close" style={{ width: 28, height: 28 }} onClick={() => setShowPicker(false)}>
              <X size={14} />
            </button>
          </div>
          <GradePicker onSelect={handleSelect} pointSystem={pointSystem} />
        </div>
      )}
    </div>
  )
}
