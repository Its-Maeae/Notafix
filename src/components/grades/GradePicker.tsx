'use client'

import { useState } from 'react'
import { getGradeColor } from '@/lib/grades'

interface GradePickerProps {
  onSelect: (value: number, modifier: string | null) => void
  pointSystem?: boolean
}

const GRADE_COLORS = [
  '#4bcc7a', // 1
  '#8ecc4b', // 2
  '#cccc4b', // 3
  '#ccaa4b', // 4
  '#cc6b4b', // 5
  '#cc4b4b', // 6
]

export default function GradePicker({ onSelect, pointSystem = false }: GradePickerProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [modifierEnabled, setModifierEnabled] = useState(false)
  const [modifier, setModifier] = useState<'plus' | 'minus' | null>(null)

  if (pointSystem) {
    const points = Array.from({ length: 16 }, (_, i) => 15 - i)
    return (
      <div className="grade-picker">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {points.map((p) => {
            const color = getGradeColor(p, true)
            return (
              <button
                key={p}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: color,
                  color: 'white',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  border: '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  onSelect(p, null)
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const grades = [1, 2, 3, 4, 5, 6]

  function handleGradeSelect(g: number) {
    setSelected(g)
    setModifier(null)
    if (!modifierEnabled) {
      onSelect(g, null)
    }
  }

  function handleModifierSelect(mod: 'plus' | 'minus' | null) {
    setModifier(mod)
    if (selected !== null) {
      onSelect(selected, mod)
    }
  }

  return (
    <div className="grade-picker">
      <div className="grade-picker-numbers">
        {grades.map((g, i) => (
          <button
            key={g}
            className={`grade-btn ${selected === g ? 'selected' : ''}`}
            style={{ backgroundColor: GRADE_COLORS[i] }}
            onClick={() => handleGradeSelect(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {!pointSystem && (
        <div className="grade-modifier-toggle">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>+/– aktivieren</span>
          <button
            className={`modifier-toggle-btn ${modifierEnabled ? 'active' : ''}`}
            onClick={() => {
              setModifierEnabled(!modifierEnabled)
              setModifier(null)
              if (!modifierEnabled && selected !== null) {
                // reset to base grade
              }
            }}
          >
            {modifierEnabled ? 'An' : 'Aus'}
          </button>
        </div>
      )}

      {modifierEnabled && selected !== null && (
        <div className="grade-modifier-options">
          {(['plus', null, 'minus'] as const).map((mod) => {
            const label = mod === 'plus' ? `${selected}+` : mod === 'minus' ? `${selected}-` : `${selected}`
            const idx = selected - 1
            return (
              <button
                key={String(mod)}
                className={`modifier-btn ${modifier === mod ? 'selected' : ''}`}
                style={{ backgroundColor: GRADE_COLORS[idx] }}
                onClick={() => handleModifierSelect(mod)}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
