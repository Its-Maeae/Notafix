import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession, TOKEN_COOKIE, TOKEN_EXPIRY_DAYS, logLoginAttempt, isIPBlocked } from '@/lib/auth'

function getIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}

export async function POST(request: NextRequest) {
  try {
    const ip = getIP(request)
    const userAgent = request.headers.get('user-agent') || undefined

    const blocked = await isIPBlocked(ip)
    if (blocked) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 })
    }

    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort sind erforderlich' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      await logLoginAttempt(email.toLowerCase(), ip, false)
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      await logLoginAttempt(email.toLowerCase(), ip, false, user.id)
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    await logLoginAttempt(email.toLowerCase(), ip, true, user.id)

    if (user.passwordResetToken) {
      return NextResponse.json({
        requiresPasswordReset: true,
        resetToken: user.passwordResetToken,
        userId: user.id,
      })
    }

    const token = await createSession(user.id, user.email, user.isAdmin, ip, userAgent)

    const response = NextResponse.json({
      success: true,
      userId: user.id,
      isAdmin: user.isAdmin,
    })
    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 })
  }
}
