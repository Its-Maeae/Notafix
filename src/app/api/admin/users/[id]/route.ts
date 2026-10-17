import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  if (params.id === user.id) {
    return NextResponse.json({ error: 'Eigenen Account nicht löschbar' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
