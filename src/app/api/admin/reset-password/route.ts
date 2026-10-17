import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId fehlt' }, { status: 400 })

  const resetToken = randomBytes(32).toString('hex')

  await prisma.user.update({
    where: { id: userId },
    data: { passwordResetToken: resetToken, passwordResetAt: new Date() },
  })

  await prisma.authToken.deleteMany({ where: { userId } })

  return NextResponse.json({ success: true, resetToken })
}
