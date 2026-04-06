import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, response, sessionOptions)
  session.destroy()
  return response
}
