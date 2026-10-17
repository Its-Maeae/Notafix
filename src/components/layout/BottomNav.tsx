'use client'

import { useRouter, usePathname } from 'next/navigation'
import { BookOpen, BookOpenCheck, Award, Settings, BarChart2 } from 'lucide-react'
import { useApp } from '@/components/AppProvider'

const navItems = [
  { label: '1. HJ',        path: '/half/1',  icon: BookOpen },
  { label: '2. HJ',        path: '/half/2',  icon: BookOpenCheck },
  { label: 'Endnote',      path: '/final',   icon: Award },
  { label: 'Statistik',    path: '/stats',   icon: BarChart2 },
  { label: 'Einstellungen',path: '/settings',icon: Settings },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedYear } = useApp()
  const isOberstufe = selectedYear?.isOberstufe ?? false

  // Oberstufe: nur ein Halbjahr pro Eintrag → "2. HJ" und "Endnote" ausblenden
  const items = isOberstufe
    ? navItems
        .filter(i => i.path !== '/half/2' && i.path !== '/final')
        .map(i => (i.path === '/half/1' ? { ...i, label: 'Halbjahr' } : i))
    : navItems

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.path || pathname.startsWith(item.path + '/')
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => router.push(item.path)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
