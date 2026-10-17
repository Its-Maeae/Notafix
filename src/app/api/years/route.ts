import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const years = await prisma.schoolYear.findMany({
    where: { userId: user.id },
    include: {
      subjects: {
        include: { grades: true, categories: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(years)
}

export async function POST(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const body = await request.json()
  const name: string | undefined = body.name
  if (!name?.trim()) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })

  const isOberstufe = body.isOberstufe === true
  const include = { subjects: { include: { grades: true, categories: true } } }

  if (!isOberstufe) {
    const year = await prisma.schoolYear.create({
      data: { name: name.trim(), userId: user.id },
      include,
    })
    return NextResponse.json(year)
  }

  // ── Oberstufe: ein Halbjahr pro Eintrag, Halbjahre über groupId verbunden ──
  const semester = Number(body.semester)
  if (![1, 2, 3, 4].includes(semester)) {
    return NextResponse.json({ error: 'Ungültiges Halbjahr' }, { status: 400 })
  }
  const groupName: string = String(body.groupName ?? name).trim()
  const label = ['11/1', '11/2', '12/1', '12/2'][semester - 1]

  // Gleiche Oberstufe (gleicher Gruppenname) wiederverwenden, falls schon vorhanden
  const existing = await prisma.schoolYear.findFirst({
    where: { userId: user.id, isOberstufe: true, groupName },
  })
  const groupId: string =
    existing?.groupId || `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const duplicate = await prisma.schoolYear.findFirst({
    where: { userId: user.id, isOberstufe: true, groupId, semester },
  })
  if (duplicate) return NextResponse.json({ error: 'Dieses Halbjahr existiert bereits' }, { status: 400 })

  const subjects: { name: string; customName?: string | null; isLeistungskurs?: boolean }[] =
    Array.isArray(body.subjects) ? body.subjects : []
  // Maximal 2 Leistungskurse
  let lkCount = 0
  const subjectData = subjects
    .filter(s => s?.name?.trim())
    .map(s => {
      const lk = s.isLeistungskurs === true && lkCount < 2
      if (lk) lkCount++
      return {
        name: s.name.trim(),
        customName: s.customName?.trim() || null,
        examWeight: 50,
        otherWeight: 50,
        isLeistungskurs: lk,
        categories: {
          create: [
            { name: 'Klassenarbeiten', weight: 50 },
            { name: 'Sonstige Noten', weight: 50 },
          ],
        },
      }
    })

  const year = await prisma.schoolYear.create({
    data: {
      name: `${groupName} · ${label}`,
      userId: user.id,
      pointSystem: true, // Oberstufe rechnet immer mit Punkten
      isOberstufe: true,
      semester,
      groupId,
      groupName,
      subjects: { create: subjectData },
    },
    include,
  })

  return NextResponse.json(year)
}
