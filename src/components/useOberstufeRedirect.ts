'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/components/AppProvider'

// Oberstufen-Halbjahre haben nur eine Halbjahr-Seite (keine 2. HJ- und Endnote-Seite)
export function useOberstufeRedirect() {
  const { selectedYear, loading } = useApp()
  const router = useRouter()
  const redirect = !loading && !!selectedYear?.isOberstufe
  useEffect(() => {
    if (redirect) router.replace('/half/1')
  }, [redirect, router])
  return redirect
}
