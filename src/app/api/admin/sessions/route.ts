import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const { sessionId, userId } = await request.json()

  if (sessionId) {
    await prisma.authToken.delete({ where: { id: sessionId } })
  } else if (userId) {
    await prisma.authToken.deleteMany({ where: { userId } })
  } else {
    return NextResponse.json({ error: 'sessionId oder userId erforderlich' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
