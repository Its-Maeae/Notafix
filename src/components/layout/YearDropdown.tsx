'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, Check, GraduationCap } from 'lucide-react'
import { SchoolYear, semesterLabel } from '@/types'
import NewYearModal from '@/components/layout/NewYearModal'

interface YearDropdownProps {
  years: SchoolYear[]
  selectedYearId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

export default function YearDropdown({
  years,
  selectedYearId,
  onSelect,
  onDelete,
}: YearDropdownProps) {
  const [open, setOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedYear = years.find((y) => y.id === selectedYearId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Oberstufen-Halbjahre mit gleicher groupId werden zusammen angezeigt
  type Entry =
    | { kind: 'year'; year: SchoolYear }
    | { kind: 'group'; groupId: string; name: string; years: SchoolYear[] }
  const entries: Entry[] = []
  const seenGroups = new Set<string>()
  for (const y of years) {
    if (y.isOberstufe && y.groupId) {
      if (seenGroups.has(y.groupId)) continue
      seenGroups.add(y.groupId)
      const members = years
        .filter(m => m.groupId === y.groupId)
        .sort((a, b) => (a.semester ?? 0) - (b.semester ?? 0))
      entries.push({ kind: 'group', groupId: y.groupId, name: y.groupName ?? y.name, years: members })
    } else {
      entries.push({ kind: 'year', year: y })
    }
  }

  function renderYear(year: SchoolYear, label: string, indent = false) {
    return (
      <div key={year.id} className="dropdown-item-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className={`dropdown-item ${year.id === selectedYearId ? 'active' : ''}`}
          style={{ flex: 1, paddingLeft: indent ? 28 : undefined }}
          onClick={() => {
            onSelect(year.id)
            setOpen(false)
          }}
        >
          {year.id === selectedYearId && <Check size={14} />}
          {label}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(year.id)
          }}
          style={{
            padding: '4px 12px',
            color: 'var(--danger)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }

  return (
    <>
    <div className="dropdown-wrapper" ref={ref}>
      <button className="dropdown-trigger" onClick={() => setOpen(!open)}>
        <span>{selectedYear?.name || 'Schuljahr wählen'}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : '' }} />
      </button>

      {open && (
        <div className="dropdown-menu">
          {years.length > 0 && (
            <>
              {entries.map(entry =>
                entry.kind === 'year'
                  ? renderYear(entry.year, entry.year.name)
                  : (
                    <div key={entry.groupId}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px 2px', fontSize: '0.7rem', fontWeight: 700,
                        letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)',
                      }}>
                        <GraduationCap size={12} /> {entry.name}
                      </div>
                      {entry.years.map(y => renderYear(y, semesterLabel(y.semester) || y.name, true))}
                    </div>
                  )
              )}
              <div className="dropdown-divider" />
            </>
          )}

          <button
            className="dropdown-item"
            style={{ color: 'var(--accent)', fontWeight: 600, justifyContent: 'flex-start', gap: 8 }}
            onClick={() => { setOpen(false); setShowNew(true) }}
          >
            <Plus size={14} /> Neues Schuljahr
          </button>
        </div>
      )}
    </div>
    {showNew && <NewYearModal onClose={() => setShowNew(false)} />}
    </>
  )
}
