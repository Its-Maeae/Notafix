import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
)

export const TOKEN_COOKIE = 'auth_token'
export const TOKEN_EXPIRY_DAYS = 30

export async function signToken(payload: { userId: string; email: string; isAdmin: boolean }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_EXPIRY_DAYS}d`)
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { userId: string; email: string; isAdmin: boolean; exp: number }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const dbToken = await prisma.authToken.findUnique({
    where: { token },
    include: { user: { include: { settings: true } } },
  })

  if (!dbToken || dbToken.expiresAt < new Date()) {
    if (dbToken) await prisma.authToken.delete({ where: { id: dbToken.id } })
    return null
  }

  return dbToken.user
}

export async function createSession(
  userId: string,
  email: string,
  isAdmin: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  const token = await signToken({ userId, email, isAdmin })
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.authToken.create({
    data: { token, userId, expiresAt, ipAddress: ipAddress ?? null, userAgent: userAgent ?? null },
  })

  return token
}

export async function deleteSession(token: string) {
  await prisma.authToken.deleteMany({ where: { token } })
}

export async function logLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
  userId?: string
) {
  await prisma.loginAttempt.create({
    data: { email, ipAddress, success, userId: userId ?? null },
  })
}

export async function isIPBlocked(ipAddress: string): Promise<boolean> {
  const blocked = await prisma.blockedIP.findUnique({ where: { ipAddress } })
  return !!blocked
}

export async function cleanupExpiredTokens() {
  await prisma.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
