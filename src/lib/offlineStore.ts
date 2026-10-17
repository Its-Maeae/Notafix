import { SchoolYear, UserSettings } from '@/types'

const DB_NAME = 'notafix-offline'
const DB_VERSION = 2

export interface OfflineAction {
  id: string          // queue entry id
  timestamp: number
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string         // may contain placeholder like __TMP_<tempId>__
  body?: unknown
  localId?: string    // tmp- id this action created (for id-mapping on sync)
}

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' })
    }
    req.onsuccess = () => { _db = req.result; resolve(_db!) }
    req.onerror = () => reject(req.error)
  })
}

function idbPut(store: string, value: unknown): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return openDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => resolve([])
  }))
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  }))
}

function idbClear(store: string): Promise<void> {
  return openDB().then(db => new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  }))
}

// ── Years ──────────────────────────────────────────────────────────────────

export async function saveYearsOffline(years: SchoolYear[]): Promise<void> {
  try {
    await idbPut('cache', { key: 'years', data: years, savedAt: Date.now() })
  } catch(e) { console.error('saveYearsOffline error', e) }
}

export async function loadYearsOffline(): Promise<SchoolYear[]> {
  try {
    const all = await idbGetAll<{ key: string; data: SchoolYear[] }>('cache')
    return all.find(e => e.key === 'years')?.data ?? []
  } catch { return [] }
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function saveSettingsOffline(settings: UserSettings): Promise<void> {
  try {
    await idbPut('cache', { key: 'settings', data: settings, savedAt: Date.now() })
  } catch {}
}

export async function loadSettingsOffline(): Promise<UserSettings | null> {
  try {
    const all = await idbGetAll<{ key: string; data: UserSettings }>('cache')
    return all.find(e => e.key === 'settings')?.data ?? null
  } catch { return null }
}

// ── Queue ──────────────────────────────────────────────────────────────────

export async function enqueueAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
  try {
    await idbPut('queue', {
      ...action,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    })
  } catch(e) { console.error('enqueueAction error', e) }
}

export async function getQueue(): Promise<OfflineAction[]> {
  try {
    const items = await idbGetAll<OfflineAction>('queue')
    return items.sort((a, b) => a.timestamp - b.timestamp)
  } catch { return [] }
}

export async function dequeueAction(id: string): Promise<void> {
  try { await idbDelete('queue', id) } catch {}
}

export async function clearQueue(): Promise<void> {
  try { await idbClear('queue') } catch {}
}

export async function getQueueLength(): Promise<number> {
  return openDB().then(db => new Promise(resolve => {
    const tx = db.transaction('queue', 'readonly')
    const req = tx.objectStore('queue').count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(0)
  }))
}

// Update a queued action's URL (after resolving a tmp id)
export async function updateQueuedAction(id: string, updates: Partial<OfflineAction>): Promise<void> {
  try {
    const all = await idbGetAll<OfflineAction>('queue')
    const action = all.find(a => a.id === id)
    if (action) await idbPut('queue', { ...action, ...updates })
  } catch {}
}
