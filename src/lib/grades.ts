import { Grade, GradeCategory } from '@/types'

export function gradeToNumeric(value: number, modifier: string | null | undefined): number {
  return value
}

export function gradeToPoints(value: number, modifier: string | null | undefined): number {
  const key = modifier ? `${value}${modifier === 'plus' ? '+' : '-'}` : `${value}`
  const map: Record<string, number> = {
    '1+': 15, '1': 14, '1-': 13,
    '2+': 12, '2': 11, '2-': 10,
    '3+': 9,  '3': 8,  '3-': 7,
    '4+': 6,  '4': 5,  '4-': 4,
    '5+': 3,  '5': 2,  '5-': 1,
    '6': 0,
  }
  return map[key] ?? 0
}

export function calculateSubjectAverage(
  grades: Grade[],
  categories: GradeCategory[],
  half: number | null,
  examWeight: number,
  otherWeight: number
): number | null {
  const filtered = half !== null ? grades.filter(g => g.half === half) : grades

  if (categories.length > 0) {
    const totalWeight = categories.reduce((s, c) => s + c.weight, 0)
    if (totalWeight === 0) return null

    let weightedSum = 0
    let usedWeight = 0

    for (const cat of categories) {
      const catGrades = filtered.filter(g => g.categoryId === cat.id)
      if (catGrades.length === 0) continue
      const avg = catGrades.reduce((s, g) => s + gradeToNumeric(g.value, g.modifier), 0) / catGrades.length
      weightedSum += avg * cat.weight
      usedWeight += cat.weight
    }

    if (usedWeight === 0) return null
    return Math.round((weightedSum / usedWeight) * 100) / 100
  }

  const examGrades = filtered.filter(g => g.type === 'exam')
  const otherGrades = filtered.filter(g => g.type === 'other')
  if (examGrades.length === 0 && otherGrades.length === 0) return null

  const examAvg = examGrades.length > 0
    ? examGrades.reduce((s, g) => s + gradeToNumeric(g.value, g.modifier), 0) / examGrades.length
    : null
  const otherAvg = otherGrades.length > 0
    ? otherGrades.reduce((s, g) => s + gradeToNumeric(g.value, g.modifier), 0) / otherGrades.length
    : null

  const totalWeight = (examAvg !== null ? examWeight : 0) + (otherAvg !== null ? otherWeight : 0)
  if (totalWeight === 0) return null

  return Math.round((
    ((examAvg ?? 0) * (examAvg !== null ? examWeight : 0) +
     (otherAvg ?? 0) * (otherAvg !== null ? otherWeight : 0)) / totalWeight
  ) * 100) / 100
}

export function calculateSubjectAveragePoints(
  grades: Grade[],
  categories: GradeCategory[],
  half: number | null,
  examWeight: number,
  otherWeight: number
): number | null {
  const filtered = half !== null ? grades.filter(g => g.half === half) : grades

  if (categories.length > 0) {
    const usedCats = categories.filter(c => filtered.some(g => g.categoryId === c.id))
    if (usedCats.length === 0) return null
    const usedWeight = usedCats.reduce((s, c) => s + c.weight, 0)
    if (usedWeight === 0) return null

    let weightedSum = 0
    for (const cat of usedCats) {
      const catGrades = filtered.filter(g => g.categoryId === cat.id)
      const avg = catGrades.reduce((s, g) => s + gradeToPoints(g.value, g.modifier), 0) / catGrades.length
      weightedSum += avg * cat.weight
    }
    return Math.round((weightedSum / usedWeight) * 100) / 100
  }

  const examGrades = filtered.filter(g => g.type === 'exam')
  const otherGrades = filtered.filter(g => g.type === 'other')
  if (examGrades.length === 0 && otherGrades.length === 0) return null

  const examAvg = examGrades.length > 0
    ? examGrades.reduce((s, g) => s + gradeToPoints(g.value, g.modifier), 0) / examGrades.length
    : null
  const otherAvg = otherGrades.length > 0
    ? otherGrades.reduce((s, g) => s + gradeToPoints(g.value, g.modifier), 0) / otherGrades.length
    : null

  const totalWeight = (examAvg !== null ? examWeight : 0) + (otherAvg !== null ? otherWeight : 0)
  if (totalWeight === 0) return null

  return Math.round((
    ((examAvg ?? 0) * (examAvg !== null ? examWeight : 0) +
     (otherAvg ?? 0) * (otherAvg !== null ? otherWeight : 0)) / totalWeight
  ) * 100) / 100
}

export function getGradeColor(avg: number | null, pointSystem = false): string {
  if (avg === null) return 'var(--color-neutral)'
  const normalized = pointSystem ? avg / 15 : 1 - (avg - 1) / 5
  return interpolateColor(normalized)
}

function interpolateColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped >= 0.5) {
    const f = (clamped - 0.5) * 2
    const r = Math.round(255 * (1 - f))
    return `rgb(${r}, 200, 60)`
  } else {
    const f = clamped * 2
    return `rgb(230, ${Math.round(200 * f)}, 60)`
  }
}

export function formatGrade(value: number, modifier: string | null | undefined, pointSystem = false): string {
  // Im Punktesystem wird direkt der Punktewert (0–15) gespeichert, nicht die Note 1–6
  if (pointSystem) return String(value)
  if (!modifier) return String(value)
  return `${value}${modifier === 'plus' ? '+' : '-'}`
}

export function formatAverage(avg: number | null, pointSystem = false): string {
  if (avg === null) return '–'
  if (pointSystem) return avg.toFixed(1)
  return avg.toFixed(2)
}