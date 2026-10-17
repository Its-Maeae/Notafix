import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const { name, customName, yearId, isLeistungskurs } = await request.json()

  const year = await prisma.schoolYear.findFirst({ where: { id: yearId, userId: user.id } })
  if (!year) return NextResponse.json({ error: 'Schuljahr nicht gefunden' }, { status: 404 })

  // Leistungskurse gibt es nur in der Oberstufe, maximal 2 pro Halbjahr
  let lk = false
  if (isLeistungskurs === true && year.isOberstufe) {
    const count = await prisma.subject.count({ where: { yearId, isLeistungskurs: true } })
    lk = count < 2
  }

  const subject = await prisma.subject.create({
    data: {
      name: name.trim(),
      customName: customName?.trim() || null,
      yearId,
      examWeight: 50,
      otherWeight: 50,
      isLeistungskurs: lk,
      categories: {
        create: [
          { name: 'Klassenarbeiten', weight: 50 },
          { name: 'Sonstige Noten', weight: 50 },
        ],
      },
    },
    include: { grades: true, categories: true },
  })

  return NextResponse.json(subject)
}
