import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const year = await prisma.schoolYear.findFirst({ where: { id: params.id, userId: user.id } })
  if (!year) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const body = await request.json()

  // Oberstufe rechnet immer mit Punkten
  if (year.isOberstufe && body.pointSystem === false) {
    return NextResponse.json({ error: 'Oberstufe nutzt immer das Punktesystem' }, { status: 400 })
  }

  if (body.pointSystem !== undefined && body.clearGrades) {
    const subjects = await prisma.subject.findMany({
      where: { yearId: params.id },
      select: { id: true },
    })
    const ids = subjects.map(s => s.id)
    if (ids.length > 0) {
      await prisma.grade.deleteMany({ where: { subjectId: { in: ids } } })
    }
  }

  const updated = await prisma.schoolYear.update({
    where: { id: params.id },
    data: { ...(body.pointSystem !== undefined && { pointSystem: body.pointSystem }) },
    include: { subjects: { include: { grades: true, categories: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const year = await prisma.schoolYear.findFirst({ where: { id: params.id, userId: user.id } })
  if (!year) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.schoolYear.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
