import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Exempt the callback route so the session can be established
	if (pathname.startsWith('/auth/callback')) return NextResponse.next()

	let response = NextResponse.next()

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll: (cookiesToSet) =>
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					),
			},
		}
	)

	const { data: { user } } = await supabase.auth.getUser()
	const isLoginPage = pathname === '/login'

	if (!user && !isLoginPage) {
		if (pathname.startsWith('/api/')) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}
		return NextResponse.redirect(new URL('/login', request.url))
	}

	if (user && isLoginPage) {
		return NextResponse.redirect(new URL('/dashboard', request.url))
	}

	return response
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
