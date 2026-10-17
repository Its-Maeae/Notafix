'use client'

import { getGradeColor, formatAverage } from '@/lib/grades'

interface AverageCircleProps {
  average: number | null
  size?: 'large' | 'medium' | 'small'
  pointSystem?: boolean
  showLabel?: boolean
}

export default function AverageCircle({
  average,
  size = 'medium',
  pointSystem = false,
  showLabel = false,
}: AverageCircleProps) {
  const color = getGradeColor(average, pointSystem)
  const display = formatAverage(average, pointSystem)

  const sizes: Record<string, { width: number; fontSize: string; labelSize: string }> = {
    large: { width: 220, fontSize: '3.5rem', labelSize: '0.75rem' },
    medium: { width: 160, fontSize: '2.5rem', labelSize: '0.7rem' },
    small: { width: 56, fontSize: '1rem', labelSize: '0' },
  }

  const s = sizes[size]

  return (
    <div
      className={`average-circle ${size}`}
      style={{
        width: s.width,
        height: s.width,
        backgroundColor: color,
        boxShadow: size === 'large' ? `0 0 60px ${color}60` : undefined,
      }}
    >
      <span className="value" style={{ fontSize: s.fontSize }}>
        {display}
      </span>
      {showLabel && size !== 'small' && average !== null && (
        <span className="label" style={{ fontSize: s.labelSize }}>
          {pointSystem ? 'Punkte' : 'Ø'}
        </span>
      )}
    </div>
  )
}
