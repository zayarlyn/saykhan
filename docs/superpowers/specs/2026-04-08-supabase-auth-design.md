# Supabase Auth Migration Design

**Date:** 2026-04-08  
**Scope:** Replace iron-session/bcrypt single-admin auth with Supabase Auth (magic link) and migrate database to Supabase Postgres.

---

## Summary

Swap the existing hand-rolled auth (bcrypt + iron-session cookie) for Supabase Auth using the `@supabase/ssr` package. The admin logs in via magic link (email OTP). The database moves to Supabase Postgres. The rest of the app (Prisma, API routes, components) is unchanged.

---

## Auth Flow

1. Admin visits `/login`, enters email, submits.
2. Login form calls `supabase.auth.signInWithOtp({ email })` (client-side).
3. Page shows "Check your email" confirmation.
4. Admin clicks magic link in email → browser hits `/auth/callback?code=...`.
5. Route handler calls `supabase.auth.exchangeCodeForSession(code)`, writes session to cookie.
6. Redirect to `/dashboard`.
7. On every request, `proxy.ts` creates a Supabase server client and calls `supabase.auth.getUser()`. No valid session → redirect to `/login` (pages) or 401 (API routes).

---

## New Files

### `lib/supabase/server.ts`
Server-side Supabase client using `createServerClient` from `@supabase/ssr`. Reads and writes cookies from `next/headers`. Used in `proxy.ts`, API routes, and server components.

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

### `lib/supabase/client.ts`
Browser-side Supabase client using `createBrowserClient` from `@supabase/ssr`. Used only in the login form component.

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `app/auth/callback/route.ts`
Route handler that receives the magic link redirect, exchanges the code for a session, and redirects to `/dashboard`.

```ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

---

## Updated Files

### `proxy.ts`
> Note: middleware cannot use `next/headers`, so it cannot use `lib/supabase/server.ts`. The Supabase client must be created inline using `request.cookies` and `response.cookies` directly.

Replace `getIronSession` check with `supabase.auth.getUser()`. The proxy must create a Supabase server client that can read **and write** cookies (token refresh). Pattern follows `@supabase/ssr` middleware guide.

```ts
const supabase = createServerClient(url, key, {
  cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (cs) => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
  },
})
const { data: { user } } = await supabase.auth.getUser()
// replace session.isLoggedIn checks with !!user
```

`/api/auth` is no longer exempt — Supabase auth endpoints live on Supabase's servers, not in this app. The `/auth/callback` route is exempt instead.

### `app/(auth)/login/page.tsx` + `components/auth/login-form.tsx`
Replace username/password fields with a single email input. On submit, call `supabase.auth.signInWithOtp({ email })`. Show a "Check your email" state after submission. No server action needed — this is entirely client-side.

### `app/api/auth/logout/route.ts`
Replace iron-session clear with `supabase.auth.signOut()`. Use the server-side Supabase client.

### `package.json`
- Add: `@supabase/supabase-js`, `@supabase/ssr`
- Remove: `iron-session`, `bcryptjs`, `@types/bcryptjs`

---

## Deleted Files

- `lib/session.ts` — replaced by `lib/supabase/`
- `app/api/auth/login/route.ts` — Supabase handles login; no server route needed

---

## Environment Variables

**Remove:**
- `SESSION_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

**Add:**
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard → Project Settings → API
- `DATABASE_URL` → update to Supabase Postgres connection string

---

## Database Migration

The existing Supabase project will be used. Steps:

1. **Enable auth in Supabase dashboard:** Authentication → Providers → Email → enable "Magic Links". Disable "Email + Password" if desired.
2. **Create admin user:** Authentication → Users → Invite user (enter admin email).
3. **Update `DATABASE_URL`** to point to Supabase Postgres (Project Settings → Database → Connection string → URI mode). Use the **pooler** URL for serverless (Vercel).
4. **Run migrations:** `npx prisma migrate deploy` with the new `DATABASE_URL`.
5. **Migrate existing data** (if needed): `pg_dump $OLD_DB | psql $SUPABASE_DB`. Skip if starting fresh.
6. **Update Vercel env vars:** swap old vars for new Supabase vars.

---

## Out of Scope

- Multi-user / role-based access
- OAuth providers (Google, GitHub)
- Row Level Security (RLS) — not needed for single-admin app
