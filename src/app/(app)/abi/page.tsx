'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { useApp } from '@/components/AppProvider'

// Platzhalter – der Abirechner folgt später.
// Die Leistungskurse (Subject.isLeistungskurs) und Halbjahre (SchoolYear.groupId/semester)
// sind bereits in der Datenbank gespeichert.
export default function AbiPage() {
  const router = useRouter()
  const { selectedYear } = useApp()

  return (
    <div className="page">
      <header className="page-header">
        <button
          className="btn-add"
          onClick={() => router.push('/half/1')}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          title="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Abirechner</h1>
        <div style={{ width: 44 }} />
      </header>
      <div className="page-content">
        <div className="empty-state">
          <GraduationCap size={40} style={{ color: 'var(--accent)', marginBottom: 12 }} />
          <h3>Kommt bald</h3>
          <p>
            Der Abirechner wird gerade vorbereitet.
            {selectedYear?.isOberstufe && ` Deine Leistungskurse für ${selectedYear.groupName ?? selectedYear.name} sind bereits gespeichert.`}
          </p>
        </div>
      </div>
    </div>
  )
}
