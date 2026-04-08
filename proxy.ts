import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (pathname.startsWith('/api/auth')) return NextResponse.next()

	const response = NextResponse.next()
	const session = await getIronSession<SessionData>(request, response, sessionOptions)

	const isLoginPage = pathname === '/login'

	if (!session.isLoggedIn && !isLoginPage) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}
		return NextResponse.redirect(new URL('/login', request.url))
	}

	if (session.isLoggedIn && isLoginPage) {
		return NextResponse.redirect(new URL('/dashboard', request.url))
	}

	return response
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
