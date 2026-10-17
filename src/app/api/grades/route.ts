import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const { subjectId, value, modifier, type, half, categoryId } = await request.json()

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, year: { userId: user.id } } })
  if (!subject) return NextResponse.json({ error: 'Fach nicht gefunden' }, { status: 404 })

  const grade = await prisma.grade.create({
    data: {
      subjectId,
      value: Number(value),
      modifier: modifier || null,
      type,
      half: Number(half),
      categoryId: categoryId || null,
    },
  })

  return NextResponse.json(grade)
}
