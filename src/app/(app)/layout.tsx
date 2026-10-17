import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AppProvider } from '@/components/AppProvider'
import BottomNav from '@/components/layout/BottomNav'
import OfflineBanner from '@/components/layout/OfflineBanner'
import AppShell from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <AppProvider initialSettings={user.settings ?? null}>
      <AppShell>
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <OfflineBanner />
          {children}
          <BottomNav />
        </div>
      </AppShell>
    </AppProvider>
  )
}
