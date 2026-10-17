import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const admin = await getSession()
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const blocked = await prisma.blockedIP.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(blocked)
}

export async function POST(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const { ipAddress, reason } = await request.json()
  if (!ipAddress) return NextResponse.json({ error: 'ipAddress fehlt' }, { status: 400 })

  const entry = await prisma.blockedIP.upsert({
    where: { ipAddress },
    update: { reason: reason ?? null },
    create: { ipAddress, reason: reason ?? null },
  })

  return NextResponse.json(entry)
}

export async function DELETE(request: NextRequest) {
  const admin = await getSession()
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

  const { ipAddress } = await request.json()
  if (!ipAddress) return NextResponse.json({ error: 'ipAddress fehlt' }, { status: 400 })

  await prisma.blockedIP.deleteMany({ where: { ipAddress } })
  return NextResponse.json({ success: true })
}
