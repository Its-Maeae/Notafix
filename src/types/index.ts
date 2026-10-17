export interface User {
  id: string
  email: string
  createdAt: Date
  settings?: UserSettings | null
}

export interface UserSettings {
  id: string
  userId: string
  darkMode: boolean
}

export interface SchoolYear {
  id: string
  name: string
  userId: string
  pointSystem: boolean
  isOberstufe?: boolean
  semester?: number | null
  groupId?: string | null
  groupName?: string | null
  subjects: Subject[]
}

export interface GradeCategory {
  id: string
  name: string
  weight: number
  subjectId: string
}

export interface Subject {
  id: string
  name: string
  customName?: string | null
  yearId: string
  examWeight: number
  otherWeight: number
  isLeistungskurs?: boolean
  grades: Grade[]
  categories: GradeCategory[]
}

export interface Grade {
  id: string
  value: number
  modifier?: string | null
  type: string
  subjectId: string
  categoryId?: string | null
  half: number
  createdAt: Date
}

export type GradeModifier = 'plus' | 'minus' | null

export interface GradeInput {
  value: number
  modifier: GradeModifier
  type: string
  half: number
  categoryId?: string | null
}

export const PREDEFINED_SUBJECTS = [
  'Mathematik',
  'Deutsch',
  'Englisch',
  'Musik',
  'Sport',
  'Geographie',
  'Informatik',
  'Geschichte',
  'Biologie',
  'Kunst',
  'Physik',
  'Chemie',
  'GRW',
  'Französisch',
  'Russisch',
  'Latein',
  'Ethik',
  'Religion',
] as const

// Fächer die beim neuen Schuljahr vorgeschlagen werden
export const DEFAULT_YEAR_SUBJECTS = [
  'Mathematik',
  'Deutsch',
  'Englisch',
  'Musik',
  'Sport',
  'Geographie',
  'Informatik',
  'Geschichte',
  'Biologie',
  'Kunst',
  'Physik',
  'Chemie',
  'GRW',
] as const

export type PredefinedSubject = typeof PREDEFINED_SUBJECTS[number]

export const GRADE_TO_POINTS: Record<string, number> = {
  '1+': 15, '1': 14, '1-': 13,
  '2+': 12, '2': 11, '2-': 10,
  '3+': 9,  '3': 8,  '3-': 7,
  '4+': 6,  '4': 5,  '4-': 4,
  '5+': 3,  '5': 2,  '5-': 1,
  '6': 0,
}

export const POINTS_TO_GRADE: Record<number, string> = {
  15: '1+', 14: '1', 13: '1-',
  12: '2+', 11: '2', 10: '2-',
  9: '3+',  8: '3',  7: '3-',
  6: '4+',  5: '4',  4: '4-',
  3: '5+',  2: '5',  1: '5-',
  0: '6',
}

export const OBERSTUFE_SEMESTERS = [
  { semester: 1, label: '11/1' },
  { semester: 2, label: '11/2' },
  { semester: 3, label: '12/1' },
  { semester: 4, label: '12/2' },
] as const

export function semesterLabel(semester: number | null | undefined): string {
  return OBERSTUFE_SEMESTERS.find(s => s.semester === semester)?.label ?? ''
}
