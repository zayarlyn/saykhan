import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
	let body: { username?: unknown; password?: unknown }
	try {
		body = await req.json()
	} catch {
		return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
	}
	const { username, password } = body

	// Always run bcrypt to avoid timing oracle that reveals correct username
	const passwordMatch = await bcrypt.compare(String(password ?? ''), process.env.ADMIN_PASSWORD_HASH as string)
	console.log(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD_HASH)
	if (username !== process.env.ADMIN_USERNAME || !passwordMatch) {
		return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
	}

	const response = NextResponse.json({ ok: true })
	const session = await getIronSession<SessionData>(req, response, sessionOptions)
	session.isLoggedIn = true
	await session.save()
	return response
}
