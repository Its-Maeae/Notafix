import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession, TOKEN_COOKIE, TOKEN_EXPIRY_DAYS } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, resetToken, newPassword } = await request.json()

    if (!userId || !resetToken || !newPassword) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.passwordResetToken !== resetToken) {
      return NextResponse.json({ error: 'Ungültiger Reset-Token' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, passwordResetToken: null, passwordResetAt: null },
    })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
    const userAgent = request.headers.get('user-agent') || undefined
    const token = await createSession(user.id, user.email, user.isAdmin, ip, userAgent)

    const response = NextResponse.json({ success: true })
    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
