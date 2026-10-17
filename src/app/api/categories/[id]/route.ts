import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getCategoryForUser(categoryId: string, userId: string) {
  return prisma.gradeCategory.findFirst({
    where: { id: categoryId, subject: { year: { userId } } },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const cat = await getCategoryForUser(params.id, user.id)
  if (!cat) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { name, weight } = await request.json()
  const updated = await prisma.gradeCategory.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(weight !== undefined && { weight }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const cat = await getCategoryForUser(params.id, user.id)
  if (!cat) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.gradeCategory.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
