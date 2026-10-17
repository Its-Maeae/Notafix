'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { SchoolYear, Subject, Grade, GradeCategory, UserSettings } from '@/types'

export interface NewSubjectInput {
  name: string
  customName?: string
  isLeistungskurs?: boolean
}

export interface NewYearInput {
  name: string
  isOberstufe?: boolean
  semester?: number
  groupName?: string
  subjects?: NewSubjectInput[]
  select?: boolean
}
import { calculateSubjectAverage } from '@/lib/grades'
import { semesterLabel } from '@/types'
import {
  saveYearsOffline, loadYearsOffline,
  saveSettingsOffline,
  enqueueAction, getQueue, dequeueAction, clearQueue, getQueueLength,
} from '@/lib/offlineStore'

interface AppContextType {
  years: SchoolYear[]
  selectedYearId: string | null
  selectedYear: SchoolYear | null
  settings: UserSettings | null
  loading: boolean
  isOnline: boolean
  pendingSync: number
  selectYear: (id: string) => void
  addYear: (input: string | NewYearInput) => Promise<string>
  deleteYear: (id: string) => Promise<void>
  addSubject: (name: string, customName?: string, opts?: { yearId?: string; isLeistungskurs?: boolean }) => Promise<void>
  deleteSubject: (subjectId: string) => Promise<void>
  addGrade: (subjectId: string, type: string, value: number, modifier: string | null, half: number, categoryId?: string | null) => Promise<void>
  deleteGrade: (gradeId: string, subjectId: string) => Promise<void>
  updateWeights: (subjectId: string, examWeight: number, otherWeight: number) => Promise<void>
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>
  updateYearPointSystem: (yearId: string, pointSystem: boolean, clearGrades: boolean) => Promise<void>
  addCategory: (subjectId: string, name: string, weight: number) => Promise<GradeCategory | null>
  updateCategory: (categoryId: string, subjectId: string, name: string, weight: number) => Promise<void>
  deleteCategory: (categoryId: string, subjectId: string) => Promise<void>
  getHalfAverage: (half: number) => number | null
  getFinalAverage: () => number | null
  refresh: () => Promise<void>
  manualSync: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

function makeTempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isTmp(id: string) {
  return id.startsWith('tmp-')
}

export function AppProvider({ children, initialSettings }: { children: ReactNode; initialSettings: UserSettings | null }) {
  const [years, setYears] = useState<SchoolYear[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(initialSettings)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSync, setPendingSync] = useState(0)
  const syncing = useRef(false)
  const yearsRef = useRef<SchoolYear[]>([])
  const selectedYearIdRef = useRef<string | null>(null)

  const selectedYear = years.find(y => y.id === selectedYearId) ?? null

  // ── Persist state to refs for use in async callbacks ─────────────────────
  useEffect(() => { yearsRef.current = years }, [years])
  useEffect(() => { selectedYearIdRef.current = selectedYearId }, [selectedYearId])

  // ── Save years + update ref atomically ───────────────────────────────────
  function setYearsAndSave(fn: (prev: SchoolYear[]) => SchoolYear[]) {
    setYears(prev => {
      const next = fn(prev)
      yearsRef.current = next
      saveYearsOffline(next)
      return next
    })
  }

  // ── Averages ─────────────────────────────────────────────────────────────
  function subjectAvg(s: Subject, half: number | null) {
    return calculateSubjectAverage(s.grades, s.categories, half, s.examWeight, s.otherWeight)
  }

  function getHalfAverage(half: number): number | null {
    const y = yearsRef.current.find(y => y.id === selectedYearIdRef.current) ?? null
    if (!y) return null
    const avgs = y.subjects.map(s => subjectAvg(s, half)).filter((a): a is number => a !== null)
    if (!avgs.length) return null
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 100) / 100
  }

  function getFinalAverage(): number | null {
    const y = yearsRef.current.find(y => y.id === selectedYearIdRef.current) ?? null
    if (!y) return null
    const avgs = y.subjects.map(s => subjectAvg(s, null)).filter((a): a is number => a !== null)
    if (!avgs.length) return null
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 100) / 100
  }

  // ── Fetch from server ────────────────────────────────────────────────────
  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch('/api/years')
      if (!res.ok) throw new Error('not ok')
      const data: SchoolYear[] = await res.json()
      setYears(data)
      yearsRef.current = data
      if (data.length > 0 && !selectedYearIdRef.current) {
        setSelectedYearId(data[0].id)
        selectedYearIdRef.current = data[0].id
      }
      await saveYearsOffline(data)
    } catch {
      // Server unreachable — show cached data
      const cached = await loadYearsOffline()
      if (cached.length > 0 && yearsRef.current.length === 0) {
        setYears(cached)
        yearsRef.current = cached
        if (!selectedYearIdRef.current) {
          setSelectedYearId(cached[0].id)
          selectedYearIdRef.current = cached[0].id
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Sync queue ────────────────────────────────────────────────────────────
  // Strategy: execute queued actions in order, map tmp IDs to real IDs as we go.
  // If an action references a tmp ID that failed earlier, skip it.
  const syncQueue = useCallback(async () => {
    if (syncing.current) return
    syncing.current = true
    try {
      const queue = await getQueue()
      if (queue.length === 0) {
        setPendingSync(0)
        return
      }
      setPendingSync(queue.length)

      // Map: localTmpId → real server id
      const idMap: Record<string, string> = {}
      // Set of tmp IDs whose creation failed — skip dependents
      const failedTmpIds = new Set<string>()

      let synced = 0

      for (const action of queue) {
        // Resolve any tmp IDs in the URL
        let url = action.url
        const urlTmpMatch = url.match(/tmp-[a-z0-9-]+/)
        if (urlTmpMatch) {
          const tmpId = urlTmpMatch[0]
          if (failedTmpIds.has(tmpId)) {
            // Parent creation failed, skip this action
            await dequeueAction(action.id)
            synced++
            continue
          }
          const realId = idMap[tmpId]
          if (!realId) {
            // Can't resolve ID — skip
            await dequeueAction(action.id)
            synced++
            continue
          }
          url = url.replace(tmpId, realId)
        }

        // Resolve tmp IDs in body
        let body = action.body
        if (body && typeof body === 'object') {
          const bodyStr = JSON.stringify(body)
          const resolvedBody = bodyStr.replace(/tmp-[a-z0-9-]+/g, match => idMap[match] ?? match)
          body = JSON.parse(resolvedBody)
        }

        try {
          const res = await fetch(url, {
            method: action.method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          })

          if (res.ok) {
            // If this was a POST that created something, record the real ID
            if (action.method === 'POST' && action.localId) {
              try {
                const created = await res.json()
                if (created?.id) idMap[action.localId] = created.id
              } catch {}
            }
            await dequeueAction(action.id)
            synced++
          } else if (res.status === 404 || res.status === 400) {
            // Item doesn't exist on server (maybe never synced) — discard
            if (action.localId) failedTmpIds.add(action.localId)
            await dequeueAction(action.id)
            synced++
          }
          // Other errors (500 etc): leave in queue, try again later
        } catch {
          // Network error — still offline, stop
          break
        }
      }

      const remaining = await getQueueLength()
      setPendingSync(remaining)

      if (remaining === 0) {
        // Queue fully cleared — reload authoritative data from server
        await fetchYears()
      }
    } finally {
      syncing.current = false
    }
  }, [fetchYears])

  // ── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Nach einem Update des Service Workers einmalig neu laden, damit die neue App-Version läuft
      const hadController = !!navigator.serviceWorker.controller
      let reloaded = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded) return
        reloaded = true
        window.location.reload()
      })
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then(reg => reg.update())
        .catch(() => {})
    }

    // Show cached data immediately while fetching
    loadYearsOffline().then(cached => {
      if (cached.length > 0 && yearsRef.current.length === 0) {
        setYears(cached)
        yearsRef.current = cached
        if (!selectedYearIdRef.current) {
          setSelectedYearId(cached[0].id)
          selectedYearIdRef.current = cached[0].id
        }
      }
    })

    // Update pending badge immediately
    getQueueLength().then(n => setPendingSync(n))

    // Fetch from server
    fetchYears()
  }, [fetchYears])

  // ── Online / offline ──────────────────────────────────────────────────────
  useEffect(() => {
    const online = () => {
      setIsOnline(true)
      syncQueue()
    }
    const offline = () => setIsOnline(false)

    window.addEventListener('online', online)
    window.addEventListener('offline', offline)

    // Set initial state
    const onlineNow = navigator.onLine
    setIsOnline(onlineNow)

    // If online on mount and queue has items, sync immediately
    if (onlineNow) {
      getQueueLength().then(n => { if (n > 0) syncQueue() })
    }

    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [syncQueue])

  useEffect(() => {
    if (settings?.darkMode === false) document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
  }, [settings?.darkMode])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function addYear(input: string | NewYearInput): Promise<string> {
    const opts: NewYearInput = typeof input === 'string' ? { name: input } : input
    const name = opts.name.trim()
    const isOberstufe = opts.isOberstufe === true
    const select = opts.select !== false
    const groupName = isOberstufe ? (opts.groupName ?? name).trim() : null
    const displayName = isOberstufe && opts.semester
      ? `${groupName} · ${semesterLabel(opts.semester)}`
      : name
    const subjectInputs = opts.subjects ?? []

    const localId = makeTempId()
    // Gleiche Oberstufe (Gruppenname) → vorhandene groupId nehmen, sonst vorläufige
    const existingGroup = isOberstufe
      ? yearsRef.current.find(y => y.isOberstufe && y.groupName === groupName)
      : undefined
    const optimistic: SchoolYear = {
      id: localId, name: displayName, userId: '',
      pointSystem: isOberstufe,
      isOberstufe,
      semester: isOberstufe ? opts.semester ?? null : null,
      groupId: isOberstufe ? (existingGroup?.groupId ?? `tmp-grp-${localId}`) : null,
      groupName,
      subjects: [],
    }
    setYearsAndSave(prev => [optimistic, ...prev])
    if (select) {
      setSelectedYearId(localId)
      selectedYearIdRef.current = localId
    }

    const body = {
      name,
      isOberstufe,
      semester: opts.semester,
      groupName: groupName ?? undefined,
      subjects: subjectInputs,
    }

    try {
      const res = await fetch('/api/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(String(res.status))
      const year: SchoolYear = await res.json()
      setYearsAndSave(prev => prev.map(y => y.id === localId ? year : y))
      if (select || selectedYearIdRef.current === localId) {
        setSelectedYearId(year.id)
        selectedYearIdRef.current = year.id
      }
      return year.id
    } catch (e) {
      const status = Number((e as Error).message)
      if (status === 400) {
        // Server hat abgelehnt (z.B. Halbjahr existiert schon) → optimistischen Eintrag zurücknehmen
        setYearsAndSave(prev => prev.filter(y => y.id !== localId))
        if (selectedYearIdRef.current === localId) {
          const next = yearsRef.current[0]?.id ?? null
          setSelectedYearId(next)
          selectedYearIdRef.current = next
        }
        return ''
      }
      // Offline: Jahr ohne Fächer in die Queue, Fächer einzeln nachziehen (damit tmp-IDs sauber aufgelöst werden)
      await enqueueAction({
        method: 'POST', url: '/api/years',
        body: { name, isOberstufe, semester: opts.semester, groupName: groupName ?? undefined },
        localId,
      })
      setPendingSync(q => q + 1)
      for (const s of subjectInputs) {
        await addSubject(s.name, s.customName, { yearId: localId, isLeistungskurs: s.isLeistungskurs })
      }
      return localId
    }
  }

  async function deleteYear(yearId: string) {
    setYearsAndSave(prev => prev.filter(y => y.id !== yearId))
    const remaining = yearsRef.current.filter(y => y.id !== yearId)
    if (selectedYearIdRef.current === yearId) {
      const next = remaining[0]?.id ?? null
      setSelectedYearId(next)
      selectedYearIdRef.current = next
    }
    if (isTmp(yearId)) return
    try {
      await fetch(`/api/years/${yearId}`, { method: 'DELETE' })
    } catch {
      await enqueueAction({ method: 'DELETE', url: `/api/years/${yearId}` })
      setPendingSync(q => q + 1)
    }
  }

  async function addSubject(
    name: string, customName?: string,
    opts?: { yearId?: string; isLeistungskurs?: boolean }
  ) {
    const yearId = opts?.yearId ?? selectedYearIdRef.current
    if (!yearId) return
    const isLeistungskurs = opts?.isLeistungskurs === true
    const localId = makeTempId()
    const cats: GradeCategory[] = [
      { id: makeTempId(), name: 'Klassenarbeiten', weight: 50, subjectId: localId },
      { id: makeTempId(), name: 'Sonstige Noten', weight: 50, subjectId: localId },
    ]
    const optimistic: Subject = {
      id: localId, name, customName: customName ?? null,
      yearId, examWeight: 50, otherWeight: 50, isLeistungskurs, grades: [], categories: cats,
    }
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId ? { ...y, subjects: [...y.subjects, optimistic] } : y
    ))

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, customName, isLeistungskurs, yearId: isTmp(yearId) ? undefined : yearId }),
      })
      if (!res.ok) throw new Error()
      const subject = await res.json()
      setYearsAndSave(prev => prev.map(y =>
        y.id === yearId ? { ...y, subjects: y.subjects.map(s => s.id === localId ? subject : s) } : y
      ))
    } catch {
      await enqueueAction({
        method: 'POST',
        url: '/api/subjects',
        body: { name, customName, yearId, isLeistungskurs },
        localId,
      })
      setPendingSync(q => q + 1)
    }
  }

  async function deleteSubject(subjectId: string) {
    const yearId = selectedYearIdRef.current
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId ? { ...y, subjects: y.subjects.filter(s => s.id !== subjectId) } : y
    ))
    if (isTmp(subjectId)) return
    try {
      await fetch(`/api/subjects/${subjectId}`, { method: 'DELETE' })
    } catch {
      await enqueueAction({ method: 'DELETE', url: `/api/subjects/${subjectId}` })
      setPendingSync(q => q + 1)
    }
  }

  async function addGrade(
    subjectId: string, type: string, value: number,
    modifier: string | null, half: number, categoryId?: string | null
  ) {
    const yearId = selectedYearIdRef.current
    const localId = makeTempId()
    const optimistic: Grade = {
      id: localId, value, modifier, type, subjectId,
      categoryId: categoryId ?? null, half, createdAt: new Date(),
    }
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, grades: [...s.grades, optimistic] } : s) }
        : y
    ))

    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: isTmp(subjectId) ? undefined : subjectId,
          value, modifier, type, half,
          categoryId: categoryId && isTmp(categoryId) ? undefined : categoryId,
        }),
      })
      if (!res.ok) throw new Error()
      const grade = await res.json()
      setYearsAndSave(prev => prev.map(y =>
        y.id === yearId
          ? {
              ...y,
              subjects: y.subjects.map(s =>
                s.id === subjectId
                  ? {
                      ...s,
                      grades: s.grades.some(g => g.id === localId)
                        ? s.grades.map(g => g.id === localId ? { ...g, id: grade.id } : g)
                        : s.grades, // localId wurde bereits gelöscht → nicht wieder einfügen
                    }
                  : s
              ),
            }
          : y
      ))
    } catch {
      await enqueueAction({
        method: 'POST',
        url: '/api/grades',
        body: { subjectId, value, modifier, type, half, categoryId },
        localId,
      })
      setPendingSync(q => q + 1)
    }
  }

  async function deleteGrade(gradeId: string, subjectId: string) {
    const yearId = selectedYearIdRef.current
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, grades: s.grades.filter(g => g.id !== gradeId) } : s) }
        : y
    ))
    if (isTmp(gradeId)) return
    try {
      await fetch(`/api/grades/${gradeId}`, { method: 'DELETE' })
    } catch {
      await enqueueAction({ method: 'DELETE', url: `/api/grades/${gradeId}` })
      setPendingSync(q => q + 1)
    }
  }

  async function updateWeights(subjectId: string, examWeight: number, otherWeight: number) {
    const yearId = selectedYearIdRef.current
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, examWeight, otherWeight } : s) }
        : y
    ))
    if (isTmp(subjectId)) return
    try {
      await fetch(`/api/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examWeight, otherWeight }),
      })
    } catch {
      await enqueueAction({ method: 'PATCH', url: `/api/subjects/${subjectId}`, body: { examWeight, otherWeight } })
      setPendingSync(q => q + 1)
    }
  }

  async function updateYearPointSystem(yearId: string, pointSystem: boolean, clearGrades: boolean) {
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, pointSystem, subjects: clearGrades ? y.subjects.map(s => ({ ...s, grades: [] })) : y.subjects }
        : y
    ))
    if (isTmp(yearId)) return
    try {
      const res = await fetch(`/api/years/${yearId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointSystem, clearGrades }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setYearsAndSave(prev => prev.map(y => y.id === yearId ? updated : y))
    } catch {
      await enqueueAction({ method: 'PATCH', url: `/api/years/${yearId}`, body: { pointSystem, clearGrades } })
      setPendingSync(q => q + 1)
    }
  }

  async function addCategory(subjectId: string, name: string, weight: number): Promise<GradeCategory | null> {
    const yearId = selectedYearIdRef.current
    const localId = makeTempId()
    const optimistic: GradeCategory = { id: localId, name, weight, subjectId }
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, categories: [...s.categories, optimistic] } : s) }
        : y
    ))
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId: isTmp(subjectId) ? undefined : subjectId, name, weight }),
      })
      if (!res.ok) throw new Error()
      const cat: GradeCategory = await res.json()
      setYearsAndSave(prev => prev.map(y =>
        y.id === yearId
          ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, categories: s.categories.map(c => c.id === localId ? cat : c) } : s) }
          : y
      ))
      return cat
    } catch {
      await enqueueAction({ method: 'POST', url: '/api/categories', body: { subjectId, name, weight }, localId })
      setPendingSync(q => q + 1)
      return optimistic
    }
  }

  async function updateCategory(categoryId: string, subjectId: string, name: string, weight: number) {
    const yearId = selectedYearIdRef.current
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? { ...y, subjects: y.subjects.map(s => s.id === subjectId ? { ...s, categories: s.categories.map(c => c.id === categoryId ? { ...c, name, weight } : c) } : s) }
        : y
    ))
    if (isTmp(categoryId)) return
    try {
      await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, weight }),
      })
    } catch {
      await enqueueAction({ method: 'PATCH', url: `/api/categories/${categoryId}`, body: { name, weight } })
      setPendingSync(q => q + 1)
    }
  }

  async function deleteCategory(categoryId: string, subjectId: string) {
    const yearId = selectedYearIdRef.current
    setYearsAndSave(prev => prev.map(y =>
      y.id === yearId
        ? {
            ...y, subjects: y.subjects.map(s => s.id === subjectId ? {
              ...s,
              categories: s.categories.filter(c => c.id !== categoryId),
              grades: s.grades.map(g => g.categoryId === categoryId ? { ...g, categoryId: null } : g),
            } : s)
          }
        : y
    ))
    if (isTmp(categoryId)) return
    try {
      await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' })
    } catch {
      await enqueueAction({ method: 'DELETE', url: `/api/categories/${categoryId}` })
      setPendingSync(q => q + 1)
    }
  }

  async function updateSettings(updates: Partial<UserSettings>) {
    const next = settings ? { ...settings, ...updates } : null
    setSettings(next)
    if (next) saveSettingsOffline(next)
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      await enqueueAction({ method: 'PATCH', url: '/api/user', body: updates })
      setPendingSync(q => q + 1)
    }
  }

  return (
    <AppContext.Provider value={{
      years, selectedYearId, selectedYear, settings, loading, isOnline, pendingSync,
      selectYear: setSelectedYearId,
      addYear, deleteYear, addSubject, deleteSubject,
      addGrade, deleteGrade, updateWeights, updateSettings,
      updateYearPointSystem, addCategory, updateCategory, deleteCategory,
      getHalfAverage, getFinalAverage,
      refresh: fetchYears,
      manualSync: syncQueue,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
