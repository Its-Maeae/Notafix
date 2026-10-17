import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getSubjectForUser(subjectId: string, userId: string) {
  return prisma.subject.findFirst({
    where: {
      id: subjectId,
      year: { userId },
    },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const subject = await getSubjectForUser(params.id, user.id)
  if (!subject) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { examWeight, otherWeight } = await request.json()

  const updated = await prisma.subject.update({
    where: { id: params.id },
    data: { examWeight, otherWeight },
    include: { grades: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const subject = await getSubjectForUser(params.id, user.id)
  if (!subject) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.subject.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
