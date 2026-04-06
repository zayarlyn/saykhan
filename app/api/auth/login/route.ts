import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (
    username !== process.env.ADMIN_USERNAME ||
    !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH as string))
  ) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, response, sessionOptions)
  session.isLoggedIn = true
  await session.save()
  return response
}
