import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSession()
  if (!user?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    include: {
      settings: true,
      tokens: {
        where: { expiresAt: { gt: new Date() } },
        select: { id: true, ipAddress: true, userAgent: true, createdAt: true },
      },
      loginAttempts: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, ipAddress: true, success: true, createdAt: true },
      },
      years: {
        include: { subjects: { include: { grades: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const usersWithStats = users.map(u => {
    const subjectsCount = u.years.reduce((acc, y) => acc + y.subjects.length, 0)
    const gradesCount = u.years.reduce((acc, y) =>
      acc + y.subjects.reduce((a, s) => a + s.grades.length, 0), 0)
    const estimatedBytes = JSON.stringify({ years: u.years }).length

    return {
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      passwordResetToken: u.passwordResetToken,
      settings: u.settings,
      activeSessions: u.tokens,
      loginAttempts: u.loginAttempts,
      stats: { years: u.years.length, subjects: subjectsCount, grades: gradesCount, estimatedBytes },
    }
  })

  return NextResponse.json(usersWithStats)
}
