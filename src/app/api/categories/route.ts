import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const { subjectId, name, weight } = await request.json()
  if (!subjectId || !name?.trim()) return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 })

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, year: { userId: user.id } } })
  if (!subject) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const category = await prisma.gradeCategory.create({
    data: { name: name.trim(), weight: weight ?? 50, subjectId },
  })

  return NextResponse.json(category)
}
