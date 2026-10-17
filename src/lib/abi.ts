// Abirechner Sachsen (Gymnasium) – reine Berechnungslogik, ohne React.
//
// Regeln (SOGYA / Abiturprüfungsordnung Sachsen):
//  • Block I:  40 Kurshalbjahre = 8 LK-Halbjahre (doppelt gewertet → 16) + 24 GK-Halbjahre → max. 600 P., min. 200 P.
//  • Block II: 5 Prüfungen (3 schriftlich, 2 mündlich), Punkte vierfach → max. 300 P., min. 100 P.
//  • Gesamt:   max. 900 P., min. 300 P. → Durchschnittsnote 1,0 – 4,0

export type Cell = number | null | 'x' // Punktzahl | offen | nicht belegt
export type SubjectCat = 'de' | 'ma' | 'fs' | 'km' | 'ge' | 'geo' | 'nw' | 'nwsub' | 'rel' | 'other'

export interface AbiSubject {
  key: string
  label: string
  isLK: boolean
  cells: Cell[]      // 4 Halbjahre: 11/1, 11/2, 12/1, 12/2
  locked: boolean[]  // true = Wert kommt aus der App und ist nicht änderbar
}

export interface ExamState {
  keys: (string | null)[]   // Fach der Prüfungen 3–5 (GK schriftlich, GK mündlich ×2)
  points: (number | null)[] // Punkte der 5 Prüfungen
}

export const EXAM_LABELS = [
  '1. Leistungsfach (schriftlich)',
  '2. Leistungsfach (schriftlich)',
  '3. Prüfungsfach (schriftlich)',
  '4. Prüfungsfach (mündlich)',
  '5. Prüfungsfach (mündlich)',
]

export const GK_SLOTS = 24
export const LK_FACTOR = 2

export function subjectKey(label: string): string {
  return label.trim().toLowerCase()
}

// ── Fächer-Einordnung ─────────────────────────────────────────────────────
const FS = ['englisch', 'französisch', 'franzoesisch', 'russisch', 'latein', 'spanisch', 'italienisch', 'polnisch', 'tschechisch', 'griechisch']

export function categorize(label: string): { cat: SubjectCat; af: 0 | 1 | 2 | 3 } {
  const l = subjectKey(label)
  if (l.startsWith('deutsch')) return { cat: 'de', af: 1 }
  if (FS.some(f => l.startsWith(f))) return { cat: 'fs', af: 1 }
  if (l.startsWith('kunst') || l.startsWith('musik')) return { cat: 'km', af: 1 }
  if (l.startsWith('geschichte')) return { cat: 'ge', af: 2 }
  if (l.startsWith('geogra') || l.startsWith('geograf') || l === 'grw' || l.startsWith('gemeinschaftskunde') || l.startsWith('wirtschaft') || l.startsWith('g/r/w')) return { cat: 'geo', af: 2 }
  if (l.startsWith('mathe')) return { cat: 'ma', af: 3 }
  if (l.startsWith('physik') || l.startsWith('chemie') || l.startsWith('biologie')) return { cat: 'nw', af: 3 }
  if (l.startsWith('informatik') || l.startsWith('fächerverb') || l.startsWith('faecherverb') || l.startsWith('fgk')) return { cat: 'nwsub', af: 3 }
  if (l.startsWith('religion') || l.startsWith('ethik')) return { cat: 'rel', af: 0 }
  return { cat: 'other', af: 0 }
}

// ── Notenumrechnung (Gesamtpunkte → Durchschnittsnote) ────────────────────
// 823–900 → 1,0 · 805–822 → 1,1 · … · 301–318 → 3,9 · 300 → 4,0 (18er-Schritte)
export function gradeFromPoints(p: number): number | null {
  if (p < 300) return null
  if (p >= 823) return 1.0
  const k = Math.floor((822 - p) / 18)
  return (11 + k) / 10
}

// Mindestpunktzahl für eine Zielnote
export function minPointsForGrade(g: number): number {
  const t = Math.round(g * 10) / 10
  if (t <= 1.0) return 823
  if (t >= 4.0) return 300
  const k = Math.round(t * 10) - 11
  return Math.max(300, 805 - 18 * k)
}

export function fmtGrade(g: number | null): string {
  return g === null ? '–' : g.toFixed(1).replace('.', ',')
}

// ── Interne Typen ─────────────────────────────────────────────────────────
type V = number | 'x'
interface FS_ {
  key: string
  label: string
  cat: SubjectCat
  af: number
  isLK: boolean
  v: V[]
}

export interface Check { label: string; ok: boolean; detail?: string }

export interface Evaluation {
  block1: number
  block2: number
  total: number
  grade: number | null
  passed: boolean
  block1Courses: number        // Anzahl der gewerteten Kurs-Slots (Soll: 40)
  selected: Set<string>        // eingebrachte GK-Kurse "key|i"
  requirements: Check[]        // Einbringungs- & Prüfungsvoraussetzungen
  passing: Check[]             // Bestehensbedingungen
}

// ── Block I: automatische, bestmögliche Einbringung ───────────────────────
function courseIds(s: FS_): string[] {
  const out: string[] = []
  s.v.forEach((x, i) => { if (x !== 'x') out.push(`${s.key}|${i}`) })
  return out
}

function product<T>(lists: T[][][]): T[][] {
  return lists.reduce<T[][]>((acc, opts) => {
    const next: T[][] = []
    for (const a of acc) for (const o of opts) next.push([...a, ...o])
    return next
  }, [[]])
}

function subsets<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]]
  const out: T[][] = []
  const rec = (start: number, cur: T[]) => {
    if (cur.length === size) { out.push([...cur]); return }
    for (let i = start; i < arr.length; i++) rec(i + 1, [...cur, arr[i]])
  }
  rec(0, [])
  return out
}

function block1(subs: FS_[], examGK: Set<string>) {
  const lk = subs.filter(s => s.isLK).slice(0, 2)
  const gk = subs.filter(s => !lk.includes(s))
  const val = new Map<string, number>()
  for (const s of subs) s.v.forEach((x, i) => { if (x !== 'x') val.set(`${s.key}|${i}`, x) })
  const v = (id: string) => val.get(id) ?? 0

  let lkPts = 0
  let lkCount = 0
  const lkIds: string[] = []
  for (const s of lk) for (const id of courseIds(s)) { lkPts += LK_FACTOR * v(id); lkCount += LK_FACTOR; lkIds.push(id) }

  const forced = gk.filter(s => examGK.has(s.key))
  const strong = [...lk, ...forced] // vollständig eingebrachte Fächer
  const covered = (cat: SubjectCat) => strong.some(s => s.cat === cat)
  const top2 = (s: FS_) => courseIds(s).sort((a, b) => v(b) - v(a)).slice(0, 2)
  const missing: string[] = []

  const baseIds = new Set<string>()
  forced.forEach(s => courseIds(s).forEach(id => baseIds.add(id)))

  // Geschichte: 4 HJ
  const ge = gk.filter(s => s.cat === 'ge')
  if (!covered('ge')) {
    if (ge.length === 0) missing.push('Geschichte (4 HJ)')
    else ge.forEach(s => courseIds(s).forEach(id => baseIds.add(id)))
  }

  const dims: string[][][] = []
  const optionDim = (cat: SubjectCat, label: string, pick: (s: FS_) => string[]) => {
    if (covered(cat)) return
    const cand = gk.filter(s => s.cat === cat)
    if (cand.length === 0) { missing.push(label); return }
    dims.push(cand.map(pick))
  }
  optionDim('fs', 'Fortgeführte Fremdsprache (4 HJ)', courseIds)
  optionDim('km', 'Kunst oder Musik (2 HJ)', top2)
  optionDim('geo', 'Geographie oder G/R/W (2 HJ)', top2)
  optionDim('rel', 'Religion oder Ethik (2 HJ)', top2)

  // Naturwissenschaften: zwei Fächer à 4 HJ (eines darf Informatik / fächerverb. GK sein)
  const nwStrong = strong.filter(s => s.cat === 'nw' || s.cat === 'nwsub')
  const need = 2 - new Set(nwStrong.map(s => s.key)).size
  if (need > 0) {
    const cand = gk.filter(s => (s.cat === 'nw' || s.cat === 'nwsub') && !strong.includes(s))
    const opts = subsets(cand, need)
      .filter(sub => [...nwStrong, ...sub].some(s => s.cat === 'nw'))
      .map(sub => sub.flatMap(courseIds))
    if (opts.length === 0) missing.push('Zwei Naturwissenschaften (je 4 HJ)')
    else dims.push(opts)
  }

  const gkAll = gk.flatMap(courseIds)
  let best: { pts: number; ids: Set<string>; mandatory: Set<string> } | null = null

  for (const combo of product(dims.length ? dims : [[[]]])) {
    const mand = new Set<string>(baseIds)
    combo.forEach(id => mand.add(id))
    if (mand.size > GK_SLOTS) continue
    const rest = gkAll.filter(id => !mand.has(id)).sort((a, b) => v(b) - v(a)).slice(0, GK_SLOTS - mand.size)
    const ids = new Set<string>(Array.from(mand).concat(rest))
    let pts = lkPts
    ids.forEach(id => { pts += v(id) })
    if (!best || pts > best.pts) best = { pts, ids, mandatory: mand }
  }

  let overflow = false
  if (!best) {
    overflow = true
    const ids = new Set(gkAll.sort((a, b) => v(b) - v(a)).slice(0, GK_SLOTS))
    let pts = lkPts
    ids.forEach(id => { pts += v(id) })
    best = { pts, ids, mandatory: new Set() }
  }

  // Bestehensbedingungen Block I
  const mandIds = Array.from(best.mandatory).concat(lkIds)
  const zeroMandatory = mandIds.some(id => v(id) === 0)
  let unterGK = 0
  best.ids.forEach(id => { if (v(id) < 5) unterGK++ })
  const unterLK = lkIds.filter(id => v(id) < 5).length

  return {
    pts: best.pts,
    selected: best.ids,
    slots: lkCount + best.ids.size,
    missing, overflow, zeroMandatory,
    unter: unterGK + unterLK, unterLK,
    lkCount: lk.length,
  }
}

// ── Gesamtauswertung ──────────────────────────────────────────────────────
// fill(key) liefert den Wert für offene Felder ("subjectKey|i" bzw. "exam|i")
export function evaluate(
  subjects: AbiSubject[],
  exam: ExamState,
  fill: (cellKey: string) => number
): Evaluation {
  const subs: FS_[] = subjects.map(s => {
    const c = categorize(s.label)
    return {
      key: s.key, label: s.label, cat: c.cat, af: c.af, isLK: s.isLK,
      v: s.cells.map((x, i) => (x === 'x' ? 'x' : x === null ? fill(`${s.key}|${i}`) : x)),
    }
  })
  const lk = subs.filter(s => s.isLK).slice(0, 2)
  const slotKeys: (string | null)[] = [lk[0]?.key ?? null, lk[1]?.key ?? null, ...exam.keys]
  const examGK = new Set<string>(slotKeys.slice(2).filter((k): k is string => !!k && !lk.some(l => l.key === k)))

  const b1 = block1(subs, examGK)

  // Block II
  const pts = [0, 1, 2, 3, 4].map(i => exam.points[i] ?? fill(`exam|${i}`))
  const block2 = pts.reduce((a, b) => a + b, 0) * 4
  const total = b1.pts + block2
  const grade = gradeFromPoints(total)

  const slotSubs = slotKeys.map(k => subs.find(s => s.key === k) ?? null)
  const assigned = slotSubs.every(Boolean) && new Set(slotKeys).size === 5
  const cats = slotSubs.map(s => s?.cat)
  const afs = new Set(slotSubs.map(s => s?.af).filter(a => a && a > 0))

  const requirements: Check[] = [
    { label: '2 Leistungskurse gewählt', ok: b1.lkCount === 2 },
    { label: '5 verschiedene Prüfungsfächer', ok: assigned },
    { label: 'Prüfungen in Deutsch und Mathematik', ok: cats.includes('de') && cats.includes('ma') },
    { label: 'Mind. 1 Prüfung in Naturwissenschaft oder Fremdsprache', ok: cats.some(c => c === 'nw' || c === 'fs') },
    { label: 'Prüfungsfächer decken alle 3 Aufgabenfelder ab', ok: afs.has(1) && afs.has(2) && afs.has(3) },
    { label: 'Einbringungspflichten erfüllt', ok: b1.missing.length === 0 && !b1.overflow, detail: b1.missing.length ? 'Fehlt: ' + b1.missing.join(', ') : b1.overflow ? 'Zu viele Pflichtkurse für 24 GK-Plätze' : undefined },
    { label: '40 Kurse in Block I einbringbar', ok: b1.slots === 40, detail: b1.slots === 40 ? undefined : `Nur ${b1.slots} von 40 möglich` },
  ]

  const zeroExam = pts.some(p => p === 0)
  const weak3 = pts.filter(p => p >= 5).length >= 3
  const weakLK = pts.slice(0, 2).some(p => p >= 5)
  const passing: Check[] = [
    { label: 'Block I: mind. 200 Punkte', ok: b1.pts >= 200, detail: `${b1.pts} P.` },
    { label: 'Keine belegpflichtige Halbjahresnote mit 0 Punkten', ok: !b1.zeroMandatory },
    { label: 'Max. 8 Unterkurse (< 5 P.), davon max. 4 aus LK', ok: b1.unter <= 8 && b1.unterLK <= 4, detail: `${b1.unter} Unterkurse, ${b1.unterLK} LK` },
    { label: 'Block II: mind. 100 Punkte', ok: block2 >= 100, detail: `${block2} P.` },
    { label: 'In 3 Prüfungen mind. 5 P., davon 1 Leistungsfach', ok: weak3 && weakLK },
    { label: 'Keine Prüfung mit 0 Punkten', ok: !zeroExam },
  ]

  const passed = passing.every(c => c.ok) && grade !== null

  return { block1: b1.pts, block2, total, grade, passed, block1Courses: b1.slots, selected: b1.selected, requirements, passing }
}

// ── Offene Felder ─────────────────────────────────────────────────────────
// Reihenfolge reihum über die Fächer, damit "+1"-Punkte auf verschiedene Fächer fallen
export function openKeys(subjects: AbiSubject[], exam: ExamState): string[] {
  const lists: string[][] = subjects.map(s =>
    s.cells.map((c, i) => (c === null ? `${s.key}|${i}` : '')).filter(Boolean)
  )
  for (let i = 0; i < 5; i++) if (exam.points[i] === null) lists.push([`exam|${i}`])
  const out: string[] = []
  const max = Math.max(0, ...lists.map(l => l.length))
  for (let r = 0; r < max; r++) for (const l of lists) if (r < l.length) out.push(l[r])
  return out
}

// Prognose: offene Felder = bisheriger Schnitt des Fachs (sonst Gesamtschnitt)
export function forecastFill(subjects: AbiSubject[], exam: ExamState): (k: string) => number {
  const nums: number[] = []
  const perSubject = new Map<string, number>()
  for (const s of subjects) {
    const own = s.cells.filter((c): c is number => typeof c === 'number')
    nums.push(...own)
    if (own.length) perSubject.set(s.key, Math.round(own.reduce((a, b) => a + b, 0) / own.length))
  }
  exam.points.forEach(p => { if (p !== null) nums.push(p) })
  const global = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 8
  return (k: string) => {
    if (k.startsWith('exam|')) return global
    return perSubject.get(k.split('|')[0]) ?? global
  }
}

// ── Zielschnitt: offene Felder gleichmäßig auffüllen ──────────────────────
export interface GoalResult {
  fill: Record<string, number>
  needed: number          // benötigte Gesamtpunkte
  reachable: boolean
  total: number           // Gesamtpunkte mit dieser Verteilung
  grade: number | null
  openCount: number
  alreadyReached: boolean // Ziel wird schon mit 0 Punkten in allen offenen Feldern erreicht
}

export function solveGoal(subjects: AbiSubject[], exam: ExamState, target: number): GoalResult {
  const needed = minPointsForGrade(target)
  const keys = openKeys(subjects, exam)
  const n = keys.length

  const build = (t: number): Record<string, number> => {
    const base = Math.floor(t / n)
    const rem = t % n
    const m: Record<string, number> = {}
    keys.forEach((k, i) => { m[k] = base + (i < rem ? 1 : 0) })
    return m
  }
  const run = (m: Record<string, number>) => evaluate(subjects, exam, k => m[k] ?? 0)
  const ok = (e: Evaluation) => e.total >= needed && e.passed

  if (n === 0) {
    const e = run({})
    return { fill: {}, needed, reachable: ok(e), total: e.total, grade: e.grade, openCount: 0, alreadyReached: ok(e) }
  }

  const maxT = n * 15
  const eMax = run(build(maxT))
  if (!ok(eMax)) {
    return { fill: build(maxT), needed, reachable: false, total: eMax.total, grade: eMax.grade, openCount: n, alreadyReached: false }
  }
  let lo = 0, hi = maxT
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (ok(run(build(mid)))) hi = mid
    else lo = mid + 1
  }
  const fill = build(lo)
  const e = run(fill)
  return { fill, needed, reachable: true, total: e.total, grade: e.grade, openCount: n, alreadyReached: lo === 0 }
}
