import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const grade = await prisma.grade.findFirst({
    where: {
      id: params.id,
      subject: { year: { userId: user.id } },
    },
  })

  if (!grade) return NextResponse.json({ error: 'Note nicht gefunden' }, { status: 404 })

  await prisma.grade.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
