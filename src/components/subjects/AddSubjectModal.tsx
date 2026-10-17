'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { PREDEFINED_SUBJECTS } from '@/types'

interface AddSubjectModalProps {
  onClose: () => void
  onAdd: (name: string, customName?: string) => Promise<void>
}

export default function AddSubjectModal({ onClose, onAdd }: AddSubjectModalProps) {
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSelect(name: string) {
    setLoading(true)
    await onAdd(name)
    onClose()
    setLoading(false)
  }

  async function handleCustom() {
    if (!customName.trim()) return
    setLoading(true)
    await onAdd('Benutzerdefiniert', customName.trim())
    onClose()
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'center', paddingBottom: 0 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderRadius: 'var(--radius)', paddingBottom: 0 }}>
        <div className="modal-header">
          <h2 className="modal-title">Fach hinzufügen</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Eigenes Fach</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Fachname eingeben..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleCustom}
                  disabled={!customName.trim() || loading}
                  style={{ flexShrink: 0 }}
                >
                  {loading ? <span className="spinner" /> : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: 12 }}>Vordefinierte Fächer</label>
            <div className="subject-grid">
              {PREDEFINED_SUBJECTS.map((name) => (
                <button
                  key={name}
                  className="subject-option"
                  onClick={() => handleSelect(name)}
                  disabled={loading}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
