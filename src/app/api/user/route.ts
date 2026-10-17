import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } })
  return NextResponse.json({ ...user, settings })
}

export async function PATCH(request: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  const body = await request.json()

  if ('darkMode' in body) {
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { ...(body.darkMode !== undefined && { darkMode: body.darkMode }) },
      create: { userId: user.id, darkMode: body.darkMode ?? false },
    })
    return NextResponse.json(settings)
  }

  if (body.email) {
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Email bereits vergeben' }, { status: 409 })
    }
    await prisma.user.update({ where: { id: user.id }, data: { email: body.email.toLowerCase() } })
    return NextResponse.json({ success: true })
  }

  if (body.currentPassword && body.newPassword) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

    const valid = await bcrypt.compare(body.currentPassword, dbUser.password)
    if (!valid) return NextResponse.json({ error: 'Aktuelles Passwort falsch' }, { status: 400 })

    if (body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Passwort zu kurz (min. 8 Zeichen)' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(body.newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
}

export async function DELETE() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })

  await prisma.user.delete({ where: { id: user.id } })

  const response = NextResponse.json({ success: true })
  response.cookies.delete('auth_token')
  return response
}
