'use client'

import HalfPage from '@/components/HalfPage'
import { useOberstufeRedirect } from '@/components/useOberstufeRedirect'

export default function Half2Page() {
  const redirecting = useOberstufeRedirect()
  if (redirecting) return null
  return <HalfPage half={2} />
}
