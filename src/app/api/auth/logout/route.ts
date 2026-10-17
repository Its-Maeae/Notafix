import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, TOKEN_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  if (token) {
    await deleteSession(token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(TOKEN_COOKIE)
  return response
}
