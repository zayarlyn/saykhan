# Supabase Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace iron-session/bcrypt auth with Supabase Auth (magic link) and update the database to Supabase Postgres.

**Architecture:** Use `@supabase/ssr` for cookie-based session management across server components, API routes, and middleware. The login page calls `supabase.auth.signInWithOtp()` client-side; a new `/auth/callback` route exchanges the magic link code for a session. `proxy.ts` guards all routes by calling `supabase.auth.getUser()` on every request.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr`, Next.js App Router, Prisma (unchanged)

---

## Pre-requisites (manual — do before running tasks)

1. In your Supabase dashboard → Authentication → Providers → Email: enable **Magic Links**, optionally disable "Email + Password sign in".
2. Authentication → URL Configuration: set **Site URL** to your Vercel domain (e.g. `https://saykhan.vercel.app`). Add `http://localhost:3000` to **Redirect URLs**.
3. Authentication → Users → **Invite user** — enter the admin email.
4. Project Settings → API: copy **Project URL** and **anon public** key.
5. Project Settings → Database → Connection string → **Transaction pooler** (port 6543): copy the URI for `DATABASE_URL`.
6. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-xx.pooler.supabase.com:6543/postgres
   ```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/supabase/server.ts` | Create | Server-side Supabase client (next/headers cookies) |
| `lib/supabase/client.ts` | Create | Browser-side Supabase client |
| `app/auth/callback/route.ts` | Create | Exchange magic link code for session |
| `proxy.ts` | Modify | Replace iron-session with supabase.auth.getUser() |
| `components/auth/login-form.tsx` | Modify | Email OTP form instead of username/password |
| `app/api/auth/logout/route.ts` | Modify | Call supabase.auth.signOut() |
| `lib/session.ts` | Delete | Replaced by lib/supabase/ |
| `app/api/auth/login/route.ts` | Delete | Supabase handles login |
| `package.json` | Modify | Add @supabase packages, remove iron-session/bcrypt |

---

### Task 1: Install packages and remove old auth dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected output: `added N packages`

- [ ] **Step 2: Remove old auth packages**

```bash
npm uninstall iron-session bcryptjs
npm uninstall --save-dev @types/bcryptjs
```

- [ ] **Step 3: Verify build still compiles (will have TS errors — that's expected)**

```bash
npm run build 2>&1 | head -20
```

Expected: TS errors about missing `iron-session` and `@/lib/session` imports — that's fine, we'll fix them in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/ssr and remove iron-session/bcryptjs"
```

---

### Task 2: Create Supabase client helpers

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )
}
```

- [ ] **Step 2: Create `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts
git commit -m "feat: add Supabase server and browser client helpers"
```

---

### Task 3: Update proxy.ts

**Files:**
- Modify: `proxy.ts`

The proxy cannot use `lib/supabase/server.ts` (which uses `next/headers`) — middleware must build the Supabase client inline using `request.cookies` and `response.cookies`.

- [ ] **Step 1: Replace proxy.ts entirely**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: update proxy to use Supabase auth session check"
```

---

### Task 4: Create /auth/callback route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: add /auth/callback route for magic link exchange"
```

---

### Task 5: Update login form

**Files:**
- Modify: `components/auth/login-form.tsx`

Replace the username/password form with an email input. The existing card styling, background pattern, logo, and copyright footer are preserved — only the form fields and submit logic change.

- [ ] **Step 1: Replace `components/auth/login-form.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stethoscope } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({ clinicName }: { clinicName: string }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-[#f5f7fa] relative overflow-hidden p-4'>
      {/* Diamond pattern background */}
      <div
        className='absolute inset-0 opacity-40'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232e37a4' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
        }}
      />

      {/* Logo above card */}
      <div className='flex items-center gap-2.5 mb-8 relative z-10'>
        <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-[#2e37a4]'>
          <Stethoscope className='w-4 h-4 text-white' />
        </div>
        <span className='text-[15px] font-semibold text-[#0a1b39]'>{clinicName}</span>
      </div>

      {/* Card */}
      <div className='relative z-10 w-full max-w-[420px] mx-4 bg-white border border-[#e7e8eb] rounded-[20px] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] p-6 sm:p-10'>
        {sent ? (
          <div className='text-center space-y-2'>
            <h1 className='text-[20px] font-bold text-[#0a1b39]'>Check your email</h1>
            <p className='text-[14px] text-[#6c7688]'>We sent a login link to your email. Click it to sign in.</p>
          </div>
        ) : (
          <>
            <div className='mb-5'>
              <h1 className='text-[20px] font-bold text-[#0a1b39] leading-[24px]'>Sign In</h1>
              <p className='text-[14px] text-[#6c7688] mt-1 leading-[21px]'>Enter your email to receive a magic link</p>
            </div>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-1'>
                <Label htmlFor='email' className='text-[13px] font-medium text-[#0a1b39]'>
                  Email
                </Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  required
                  className='h-9 text-[14px] border-[#e7e8eb] shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] focus-visible:ring-[#2e37a4] placeholder:text-[#9da4b0]'
                />
              </div>
              {error && <p className='text-[13px] text-[#ef1e1e] bg-red-50 px-3 py-2 rounded-md'>{error}</p>}
              <button
                type='submit'
                disabled={loading}
                className='w-full h-[38px] bg-[#2e37a4] hover:bg-[#252d8a] text-white text-[14px] font-medium rounded-md transition-colors disabled:opacity-60 mt-1'
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className='relative z-10 mt-8 text-[13px] text-[#6c7688]'>Copyright @2025 - {clinicName}</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/login-form.tsx
git commit -m "feat: replace username/password login with Supabase magic link"
```

---

### Task 6: Update logout route

**Files:**
- Modify: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Replace logout route**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/logout/route.ts
git commit -m "feat: update logout to use supabase.auth.signOut()"
```

---

### Task 7: Delete old auth files

**Files:**
- Delete: `lib/session.ts`
- Delete: `app/api/auth/login/route.ts`

- [ ] **Step 1: Delete files**

```bash
rm lib/session.ts app/api/auth/login/route.ts
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | grep -E "Type error|error TS|Error"
```

Expected: no errors. If there are leftover imports of `@/lib/session` or `iron-session` anywhere, fix them now.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove iron-session auth files, complete Supabase migration"
```

---

### Task 8: Database migration

This task is manual — no code changes.

- [ ] **Step 1: Point DATABASE_URL at Supabase and run migrations**

```bash
# Make sure DATABASE_URL in .env.local is the Supabase pooler connection string, then:
npx prisma migrate deploy
```

Expected: `All migrations have been successfully applied.`

- [ ] **Step 2: (Optional) Migrate existing data**

If you have data to keep from your old Postgres:
```bash
pg_dump $OLD_DATABASE_URL | psql $SUPABASE_DATABASE_URL
```

Skip this if starting fresh or seeding with demo data.

- [ ] **Step 3: Update Vercel environment variables**

In Vercel dashboard → Project → Settings → Environment Variables:
- Remove: `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`
- Add: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Update: `DATABASE_URL` → Supabase pooler URI

- [ ] **Step 4: Push and redeploy**

```bash
git push
```

Trigger a new Vercel deployment and verify login works end-to-end.

---

## Verification Checklist

After all tasks are complete:

- [ ] `npm run build` passes with no errors
- [ ] `/login` shows email input form
- [ ] Submitting email shows "Check your email" confirmation
- [ ] Clicking magic link in email redirects to `/dashboard`
- [ ] Visiting `/dashboard` without a session redirects to `/login`
- [ ] Logging out via sidebar clears session and redirects to `/login`
- [ ] API routes return 401 without a valid session
