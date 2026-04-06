# Saykhan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Saykhan — a clinic inventory and patient session management web app for single-owner use.

**Architecture:** Next.js 14 App Router (full-stack), Prisma ORM with PostgreSQL, shadcn/ui + Tailwind for UI, iron-session for single-user auth. API logic lives in Next.js route handlers. Critical mutations (session creation, restock) use Prisma transactions.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, shadcn/ui, Tailwind CSS, Recharts, react-hook-form, zod, iron-session, bcryptjs, Jest + @testing-library/react

---

## File Map

### Config
- `prisma/schema.prisma` — full data model
- `.env.local` — DATABASE_URL, SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
- `lib/prisma.ts` — Prisma client singleton
- `lib/session.ts` — iron-session config + SessionData type
- `middleware.ts` — protect all routes except /login

### Validation Schemas
- `lib/validations/medication.ts`
- `lib/validations/restock.ts`
- `lib/validations/session.ts`
- `lib/validations/patient.ts`
- `lib/validations/expense.ts`

### API Routes
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/medications/route.ts` — GET list, POST create
- `app/api/medications/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/restock/route.ts` — POST (multi-item batch)
- `app/api/sessions/route.ts` — GET list (with filters), POST create
- `app/api/sessions/[id]/route.ts` — GET, DELETE
- `app/api/patients/route.ts` — GET list, POST create
- `app/api/patients/[id]/route.ts` — GET (with sessions), PATCH
- `app/api/expenses/route.ts` — GET list, POST create
- `app/api/expenses/[id]/route.ts` — PATCH, DELETE
- `app/api/dashboard/route.ts` — GET monthly stats + low-stock
- `app/api/settings/[entity]/route.ts` — GET list, POST create, DELETE by id

### Pages
- `app/(auth)/login/page.tsx`
- `app/(protected)/layout.tsx` — sidebar + auth guard
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/inventory/page.tsx`
- `app/(protected)/inventory/restock/page.tsx`
- `app/(protected)/sessions/page.tsx`
- `app/(protected)/sessions/new/page.tsx`
- `app/(protected)/patients/page.tsx`
- `app/(protected)/patients/[id]/page.tsx`
- `app/(protected)/expenses/page.tsx`
- `app/(protected)/settings/page.tsx`

### Components
- `components/layout/sidebar.tsx`
- `components/inventory/medication-table.tsx`
- `components/inventory/medication-form.tsx`
- `components/inventory/restock-form.tsx`
- `components/sessions/session-table.tsx`
- `components/sessions/session-form.tsx`
- `components/sessions/medication-selector.tsx`
- `components/patients/patient-table.tsx`
- `components/expenses/expense-table.tsx`
- `components/expenses/expense-form.tsx`
- `components/dashboard/summary-cards.tsx`
- `components/dashboard/low-stock-list.tsx`
- `components/settings/lookup-manager.tsx`

### Tests
- `__tests__/api/restock.test.ts` — batch creation, stock increment, expense generation
- `__tests__/api/sessions.test.ts` — session creation, stock decrement, insufficient stock rejection
- `__tests__/api/dashboard.test.ts` — correct monthly calculation, restock excluded

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json` (via next init)
- Create: `.env.local`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/zayarlyn/side-projects/saykhan
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*" --yes
```

Expected: Next.js project created with App Router and TypeScript.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install prisma @prisma/client iron-session bcryptjs react-hook-form @hookform/resolvers zod recharts
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D @types/bcryptjs jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-jest @types/jest
```

- [ ] **Step 4: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 5: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input label card table form select textarea badge toast dialog alert-dialog separator
```

- [ ] **Step 6: Create .env.local**

```bash
# Copy .env to .env.local and add required vars
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/saykhan"
DATABASE_TEST_URL="postgresql://postgres:password@localhost:5432/saykhan_test"
SESSION_SECRET="change-this-to-a-random-32-char-string-minimum"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH=""
EOF
```

Then generate a password hash (replace `yourpassword`):
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(h => console.log(h))"
```
Paste the output into `ADMIN_PASSWORD_HASH` in `.env.local`.

- [ ] **Step 7: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js project with Prisma, shadcn/ui, and Jest"
```

---

## Task 2: Prisma Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Write the full schema**

Replace `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model MedicationCategory {
  id          String       @id @default(cuid())
  name        String       @unique
  medications Medication[]
  createdAt   DateTime     @default(now())
}

model ServiceType {
  id        String           @id @default(cuid())
  name      String           @unique
  sessions  PatientSession[]
  createdAt DateTime         @default(now())
}

model PaymentMethod {
  id        String           @id @default(cuid())
  name      String           @unique
  sessions  PatientSession[]
  createdAt DateTime         @default(now())
}

model ExpenseCategory {
  id        String    @id @default(cuid())
  name      String    @unique
  expenses  Expense[]
  createdAt DateTime  @default(now())
}

model Patient {
  id        String           @id @default(cuid())
  name      String
  sessions  PatientSession[]
  createdAt DateTime         @default(now())
}

model Medication {
  id           String              @id @default(cuid())
  name         String
  categoryId   String
  category     MedicationCategory  @relation(fields: [categoryId], references: [id])
  cost         Decimal             @db.Decimal(10, 2)
  sellingPrice Decimal             @db.Decimal(10, 2)
  stock        Int                 @default(0)
  threshold    Int                 @default(10)
  restockItems RestockBatchItem[]
  sessionMeds  SessionMedication[]
  createdAt    DateTime            @default(now())
}

model RestockBatch {
  id        String            @id @default(cuid())
  date      DateTime
  items     RestockBatchItem[]
  expense   Expense?
  createdAt DateTime          @default(now())
}

model RestockBatchItem {
  id             String       @id @default(cuid())
  restockBatchId String
  restockBatch   RestockBatch @relation(fields: [restockBatchId], references: [id])
  medicationId   String
  medication     Medication   @relation(fields: [medicationId], references: [id])
  quantity       Int
  costPerUnit    Decimal      @db.Decimal(10, 2)
  expiryDate     DateTime?
  createdAt      DateTime     @default(now())
}

model PatientSession {
  id              String              @id @default(cuid())
  patientId       String
  patient         Patient             @relation(fields: [patientId], references: [id])
  serviceTypeId   String
  serviceType     ServiceType         @relation(fields: [serviceTypeId], references: [id])
  paymentMethodId String
  paymentMethod   PaymentMethod       @relation(fields: [paymentMethodId], references: [id])
  date            DateTime
  description     String?
  paymentAmount   Decimal             @db.Decimal(10, 2)
  medications     SessionMedication[]
  createdAt       DateTime            @default(now())
}

model SessionMedication {
  id           String         @id @default(cuid())
  sessionId    String
  session      PatientSession @relation(fields: [sessionId], references: [id])
  medicationId String
  medication   Medication     @relation(fields: [medicationId], references: [id])
  quantity     Int
  unitCost     Decimal        @db.Decimal(10, 2)
  sellingPrice Decimal        @db.Decimal(10, 2)
  createdAt    DateTime       @default(now())
}

model Expense {
  id             String           @id @default(cuid())
  categoryId     String?
  category       ExpenseCategory? @relation(fields: [categoryId], references: [id])
  type           ExpenseType      @default(MANUAL)
  amount         Decimal          @db.Decimal(10, 2)
  description    String?
  date           DateTime
  restockBatchId String?          @unique
  restockBatch   RestockBatch?    @relation(fields: [restockBatchId], references: [id])
  createdAt      DateTime         @default(now())
}

enum ExpenseType {
  RESTOCK
  MANUAL
}
```

- [ ] **Step 2: Create and run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration file created in `prisma/migrations/`, tables created in the database.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Create Prisma singleton**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/prisma.ts
git commit -m "feat: add Prisma schema with full data model and initial migration"
```

---

## Task 3: Authentication

**Files:**
- Create: `lib/session.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create session config**

Create `lib/session.ts`:
```typescript
import { SessionOptions } from 'iron-session'

export interface SessionData {
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'saykhan_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}
```

- [ ] **Step 2: Create login route**

Create `app/api/auth/login/route.ts`:
```typescript
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
```

- [ ] **Step 3: Create logout route**

Create `app/api/auth/logout/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true })
  const session = await getIronSession<SessionData>(req, response, sessionOptions)
  session.destroy()
  return response
}
```

- [ ] **Step 4: Create middleware**

Create `middleware.ts` at the project root:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow API routes to handle their own auth if needed
  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  const isLoginPage = pathname === '/login'

  if (!session.isLoggedIn && !isLoginPage) {
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
```

- [ ] **Step 5: Create login page**

Create `app/(auth)/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Saykhan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Test auth flow manually**

```bash
npm run dev
```

Visit `http://localhost:3000` — should redirect to `/login`. Log in with configured credentials — should redirect to `/dashboard` (404 is fine at this point).

- [ ] **Step 7: Commit**

```bash
git add lib/session.ts middleware.ts app/api/auth app/(auth)
git commit -m "feat: add single-user auth with iron-session"
```

---

## Task 4: Protected Layout & Sidebar

**Files:**
- Create: `app/(protected)/layout.tsx`
- Create: `components/layout/sidebar.tsx`
- Create: `app/(protected)/dashboard/page.tsx` (stub)

- [ ] **Step 1: Create sidebar**

Create `components/layout/sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/patients', label: 'Patients' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 border-r bg-white flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">Saykhan</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'block px-3 py-2 rounded text-sm hover:bg-gray-100',
              pathname.startsWith(href) && 'bg-gray-100 font-medium'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create protected layout**

Create `app/(protected)/layout.tsx`:
```typescript
import { Sidebar } from '@/components/layout/sidebar'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard stub**

Create `app/(protected)/dashboard/page.tsx`:
```typescript
export default function DashboardPage() {
  return <h1 className="text-2xl font-bold">Dashboard</h1>
}
```

- [ ] **Step 4: Verify layout renders**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard` after logging in — sidebar + page content should be visible.

- [ ] **Step 5: Commit**

```bash
git add app/(protected) components/layout
git commit -m "feat: add protected layout with sidebar and navigation"
```

---

## Task 5: Settings — Lookup Tables

**Files:**
- Create: `app/api/settings/[entity]/route.ts`
- Create: `lib/validations/settings.ts`
- Create: `components/settings/lookup-manager.tsx`
- Create: `app/(protected)/settings/page.tsx`

- [ ] **Step 1: Write validation**

Create `lib/validations/settings.ts`:
```typescript
import { z } from 'zod'

export const VALID_ENTITIES = [
  'medication-category',
  'service-type',
  'payment-method',
  'expense-category',
] as const

export type EntityType = (typeof VALID_ENTITIES)[number]

export const createLookupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})
```

- [ ] **Step 2: Write API route**

Create `app/api/settings/[entity]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VALID_ENTITIES, createLookupSchema } from '@/lib/validations/settings'

const modelMap = {
  'medication-category': () => prisma.medicationCategory,
  'service-type': () => prisma.serviceType,
  'payment-method': () => prisma.paymentMethod,
  'expense-category': () => prisma.expenseCategory,
} as const

function getModel(entity: string) {
  if (!VALID_ENTITIES.includes(entity as any)) return null
  return (modelMap as any)[entity]()
}

export async function GET(req: NextRequest, { params }: { params: { entity: string } }) {
  const model = getModel(params.entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = await model.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: { entity: string } }) {
  const model = getModel(params.entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createLookupSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const item = await model.create({ data: { name: parsed.data.name } })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { entity: string } }) {
  const model = getModel(params.entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await model.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create LookupManager component**

Create `components/settings/lookup-manager.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const schema = z.object({ name: z.string().min(1) })

interface Item { id: string; name: string }

interface Props {
  label: string
  entity: string
  initial: Item[]
}

export function LookupManager({ label, entity, initial }: Props) {
  const [items, setItems] = useState<Item[]>(initial)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  async function onAdd(data: { name: string }) {
    const res = await fetch(`/api/settings/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const item = await res.json()
      setItems(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
      reset()
    }
  }

  async function onDelete(id: string) {
    await fetch(`/api/settings/${entity}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{label}</h3>
      <form onSubmit={handleSubmit(onAdd)} className="flex gap-2">
        <Input placeholder={`Add ${label.toLowerCase()}…`} {...register('name')} />
        <Button type="submit" size="sm">Add</Button>
      </form>
      {errors.name && <p className="text-xs text-red-500">Required</p>}
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <Badge key={item.id} variant="secondary" className="gap-1">
            {item.name}
            <button onClick={() => onDelete(item.id)} className="text-xs hover:text-red-600">×</button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create settings page**

Create `app/(protected)/settings/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { LookupManager } from '@/components/settings/lookup-manager'
import { Separator } from '@/components/ui/separator'

export default async function SettingsPage() {
  const [medCategories, serviceTypes, paymentMethods, expenseCategories] = await Promise.all([
    prisma.medicationCategory.findMany({ orderBy: { name: 'asc' } }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <LookupManager label="Medication Categories" entity="medication-category" initial={medCategories} />
      <Separator />
      <LookupManager label="Service Types" entity="service-type" initial={serviceTypes} />
      <Separator />
      <LookupManager label="Payment Methods" entity="payment-method" initial={paymentMethods} />
      <Separator />
      <LookupManager label="Expense Categories" entity="expense-category" initial={expenseCategories} />
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Navigate to `/settings`. Add a few service types (e.g. "Stitching", "Medicine Sale", "Consultation"). They should appear as badges and be deletable.

- [ ] **Step 6: Commit**

```bash
git add app/api/settings app/(protected)/settings components/settings lib/validations/settings.ts
git commit -m "feat: add settings page for managing lookup tables"
```

---

## Task 6: Inventory — Medication CRUD

**Files:**
- Create: `lib/validations/medication.ts`
- Create: `app/api/medications/route.ts`
- Create: `app/api/medications/[id]/route.ts`
- Create: `components/inventory/medication-table.tsx`
- Create: `components/inventory/medication-form.tsx`
- Create: `app/(protected)/inventory/page.tsx`

- [ ] **Step 1: Write validation schema**

Create `lib/validations/medication.ts`:
```typescript
import { z } from 'zod'

export const createMedicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  cost: z.number().positive('Cost must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  threshold: z.number().int().nonnegative().default(10),
})

export const updateMedicationSchema = createMedicationSchema.partial()
```

- [ ] **Step 2: Write GET/POST route**

Create `app/api/medications/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMedicationSchema } from '@/lib/validations/medication'

export async function GET() {
  const medications = await prisma.medication.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  // Attach nearest expiry from restockItems
  const withExpiry = await Promise.all(
    medications.map(async med => {
      const nearestBatch = await prisma.restockBatchItem.findFirst({
        where: { medicationId: med.id, expiryDate: { gte: new Date() } },
        orderBy: { expiryDate: 'asc' },
      })
      return { ...med, nearestExpiry: nearestBatch?.expiryDate ?? null }
    })
  )

  return NextResponse.json(withExpiry)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createMedicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const med = await prisma.medication.create({
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      cost: parsed.data.cost,
      sellingPrice: parsed.data.sellingPrice,
      threshold: parsed.data.threshold,
    },
    include: { category: true },
  })
  return NextResponse.json(med, { status: 201 })
}
```

- [ ] **Step 3: Write GET/PATCH/DELETE by id route**

Create `app/api/medications/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateMedicationSchema } from '@/lib/validations/medication'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const med = await prisma.medication.findUnique({
    where: { id: params.id },
    include: { category: true },
  })
  if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(med)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = updateMedicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const med = await prisma.medication.update({
    where: { id: params.id },
    data: parsed.data,
    include: { category: true },
  })
  return NextResponse.json(med)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.medication.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create MedicationForm component**

Create `components/inventory/medication-form.tsx`:
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  cost: z.coerce.number().positive(),
  sellingPrice: z.coerce.number().positive(),
  threshold: z.coerce.number().int().nonnegative(),
})

type FormData = z.infer<typeof schema>

interface Category { id: string; name: string }

interface Props {
  categories: Category[]
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
}

export function MedicationForm({ categories, defaultValues, onSubmit, submitLabel = 'Save' }: Props) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { threshold: 10, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Category</Label>
        <Select onValueChange={v => setValue('categoryId', v)} defaultValue={defaultValues?.categoryId}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Cost</Label>
          <Input type="number" step="0.01" {...register('cost')} />
          {errors.cost && <p className="text-xs text-red-500">{errors.cost.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Selling Price</Label>
          <Input type="number" step="0.01" {...register('sellingPrice')} />
          {errors.sellingPrice && <p className="text-xs text-red-500">{errors.sellingPrice.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Low-Stock Threshold</Label>
        <Input type="number" {...register('threshold')} />
      </div>
      <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
    </form>
  )
}
```

- [ ] **Step 5: Create inventory table component**

Create `components/inventory/medication-table.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Medication {
  id: string
  name: string
  category: { name: string }
  cost: number
  sellingPrice: number
  stock: number
  threshold: number
  nearestExpiry: string | null
}

export function MedicationTable({ medications }: { medications: Medication[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = medications.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <Input placeholder="Search medications…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Sell Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Nearest Expiry</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(med => (
              <tr key={med.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/inventory/${med.id}/edit`)}>
                <td className="px-4 py-2 font-medium">{med.name}</td>
                <td className="px-4 py-2 text-gray-500">{med.category.name}</td>
                <td className="px-4 py-2">{Number(med.cost).toFixed(2)}</td>
                <td className="px-4 py-2">{Number(med.sellingPrice).toFixed(2)}</td>
                <td className="px-4 py-2">
                  {med.stock}
                  {med.stock <= med.threshold && (
                    <span className="ml-1 text-orange-500 text-xs">⚠ low</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {med.nearestExpiry ? new Date(med.nearestExpiry).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={med.stock > 0 ? 'default' : 'destructive'}>
                    {med.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No medications found</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create inventory page**

Create `app/(protected)/inventory/page.tsx`:
```typescript
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { MedicationTable } from '@/components/inventory/medication-table'

export default async function InventoryPage() {
  const medications = await prisma.medication.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  const withExpiry = await Promise.all(
    medications.map(async med => {
      const nearestBatch = await prisma.restockBatchItem.findFirst({
        where: { medicationId: med.id, expiryDate: { gte: new Date() } },
        orderBy: { expiryDate: 'asc' },
      })
      return { ...med, nearestExpiry: nearestBatch?.expiryDate?.toISOString() ?? null }
    })
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/inventory/restock">Restock</Link></Button>
          <Button asChild><Link href="/inventory/new">Add Medication</Link></Button>
        </div>
      </div>
      <MedicationTable medications={withExpiry} />
    </div>
  )
}
```

- [ ] **Step 7: Create add medication page**

Create `app/(protected)/inventory/new/page.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { prisma } from '@/lib/prisma' // Note: can't use prisma directly in client — fetch from API
import { MedicationForm } from '@/components/inventory/medication-form'
import { useEffect, useState } from 'react'

export default function NewMedicationPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetch('/api/settings/medication-category').then(r => r.json()).then(setCategories)
  }, [])

  async function handleSubmit(data: any) {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) router.push('/inventory')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Medication</h1>
      <MedicationForm categories={categories} onSubmit={handleSubmit} submitLabel="Add Medication" />
    </div>
  )
}
```

- [ ] **Step 8: Verify in browser**

Add a medication category in Settings, then go to `/inventory/new` and add a medication. It should appear in `/inventory`.

- [ ] **Step 9: Commit**

```bash
git add app/api/medications app/(protected)/inventory/page.tsx app/(protected)/inventory/new lib/validations/medication.ts components/inventory/medication-table.tsx components/inventory/medication-form.tsx
git commit -m "feat: add inventory medication CRUD with table and form"
```

---

## Task 7: Inventory — Restock (Integration Test)

**Files:**
- Create: `lib/validations/restock.ts`
- Create: `app/api/restock/route.ts`
- Create: `components/inventory/restock-form.tsx`
- Create: `app/(protected)/inventory/restock/page.tsx`
- Create: `__tests__/api/restock.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `__tests__/api/restock.test.ts`:
```typescript
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/restock/route'
import { NextRequest } from 'next/server'

// Uses DATABASE_TEST_URL — run: DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy
describe('POST /api/restock', () => {
  let categoryId: string
  let medId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Test Cat' } })
    categoryId = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Paracetamol', categoryId, cost: 1.0, sellingPrice: 2.0, stock: 5 },
    })
    medId = med.id
  })

  afterAll(async () => {
    await prisma.restockBatchItem.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.restockBatch.deleteMany()
    await prisma.medication.deleteMany()
    await prisma.medicationCategory.deleteMany()
    await prisma.$disconnect()
  })

  it('increments stock and creates expense in a transaction', async () => {
    const body = {
      date: new Date().toISOString(),
      items: [{ medicationId: medId, quantity: 10, costPerUnit: 1.5, expiryDate: '2027-01-01' }],
    }
    const req = new NextRequest('http://localhost/api/restock', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(15) // was 5, added 10

    const expense = await prisma.expense.findFirst({ where: { type: 'RESTOCK' } })
    expect(expense).not.toBeNull()
    expect(Number(expense!.amount)).toBe(15) // 10 * 1.5
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/restock.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/restock/route'`

- [ ] **Step 3: Write restock validation**

Create `lib/validations/restock.ts`:
```typescript
import { z } from 'zod'

export const restockItemSchema = z.object({
  medicationId: z.string().min(1),
  quantity: z.number().int().positive(),
  costPerUnit: z.number().positive(),
  expiryDate: z.string().datetime().optional().nullable(),
})

export const createRestockSchema = z.object({
  date: z.string().datetime(),
  items: z.array(restockItemSchema).min(1, 'At least one item required'),
})
```

- [ ] **Step 4: Write restock API route**

Create `app/api/restock/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRestockSchema } from '@/lib/validations/restock'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createRestockSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { date, items } = parsed.data
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)

  const batch = await prisma.$transaction(async tx => {
    const restockBatch = await tx.restockBatch.create({
      data: {
        date: new Date(date),
        items: {
          create: items.map(item => ({
            medicationId: item.medicationId,
            quantity: item.quantity,
            costPerUnit: item.costPerUnit,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: { items: true },
    })

    // Increment stock for each medication
    await Promise.all(
      items.map(item =>
        tx.medication.update({
          where: { id: item.medicationId },
          data: { stock: { increment: item.quantity } },
        })
      )
    )

    // Create one expense for the total
    await tx.expense.create({
      data: {
        type: 'RESTOCK',
        amount: totalCost,
        description: `Restock batch — ${items.length} item(s)`,
        date: new Date(date),
        restockBatchId: restockBatch.id,
      },
    })

    return restockBatch
  })

  return NextResponse.json(batch, { status: 201 })
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/restock.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 6: Create RestockForm component**

Create `components/inventory/restock-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  date: z.string().min(1),
  items: z.array(z.object({
    medicationId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    costPerUnit: z.coerce.number().positive(),
    expiryDate: z.string().optional(),
  })).min(1),
})

type FormData = z.infer<typeof schema>

interface Medication { id: string; name: string }

export function RestockForm({ medications }: { medications: Medication[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 16),
      items: [{ medicationId: '', quantity: 1, costPerUnit: 0, expiryDate: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  async function onSubmit(data: FormData) {
    const body = {
      ...data,
      date: new Date(data.date).toISOString(),
      items: data.items.map(item => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
      })),
    }
    const res = await fetch('/api/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      router.push('/inventory')
    } else {
      setError('Failed to save restock. Check all fields.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Label>Restock Date</Label>
        <Input type="datetime-local" {...register('date')} />
      </div>

      <div className="space-y-4">
        {fields.map((field, i) => (
          <div key={field.id} className="border rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {i + 1}</span>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Medication</Label>
                <Select onValueChange={v => setValue(`items.${i}.medicationId`, v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {medications.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" {...register(`items.${i}.quantity`)} />
              </div>
              <div className="space-y-1">
                <Label>Cost per Unit</Label>
                <Input type="number" step="0.01" {...register(`items.${i}.costPerUnit`)} />
              </div>
              <div className="space-y-1">
                <Label>Expiry Date</Label>
                <Input type="date" {...register(`items.${i}.expiryDate`)} />
              </div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => append({ medicationId: '', quantity: 1, costPerUnit: 0, expiryDate: '' })}>
          + Add Item
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>Save Restock</Button>
    </form>
  )
}
```

- [ ] **Step 7: Create restock page**

Create `app/(protected)/inventory/restock/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { RestockForm } from '@/components/inventory/restock-form'

export default async function RestockPage() {
  const medications = await prisma.medication.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Restock Inventory</h1>
      <RestockForm medications={medications} />
    </div>
  )
}
```

- [ ] **Step 8: Verify in browser**

Go to `/inventory/restock`, add a multi-item restock. Check `/inventory` that stock updated, and `/expenses` will show the auto-generated RESTOCK expense (after Task 10 is done; for now verify via Prisma Studio).

```bash
npx prisma studio
```

- [ ] **Step 9: Commit**

```bash
git add app/api/restock lib/validations/restock.ts components/inventory/restock-form.tsx app/(protected)/inventory/restock __tests__/api/restock.test.ts
git commit -m "feat: add restock batch with stock increment and expense generation (tested)"
```

---

## Task 8: Patient Management

**Files:**
- Create: `lib/validations/patient.ts`
- Create: `app/api/patients/route.ts`
- Create: `app/api/patients/[id]/route.ts`
- Create: `components/patients/patient-table.tsx`
- Create: `app/(protected)/patients/page.tsx`
- Create: `app/(protected)/patients/[id]/page.tsx`

- [ ] **Step 1: Write validation**

Create `lib/validations/patient.ts`:
```typescript
import { z } from 'zod'

export const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export const updatePatientSchema = createPatientSchema.partial()
```

- [ ] **Step 2: Write patient routes**

Create `app/api/patients/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPatientSchema } from '@/lib/validations/patient'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('q') ?? ''
  const patients = await prisma.patient.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
    orderBy: { name: 'asc' },
    include: { _count: { select: { sessions: true } } },
  })
  return NextResponse.json(patients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createPatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const patient = await prisma.patient.create({ data: { name: parsed.data.name } })
  return NextResponse.json(patient, { status: 201 })
}
```

Create `app/api/patients/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePatientSchema } from '@/lib/validations/patient'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: { serviceType: true, paymentMethod: true, medications: { include: { medication: true } } },
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(patient)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = updatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const patient = await prisma.patient.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(patient)
}
```

- [ ] **Step 3: Create patient table component**

Create `components/patients/patient-table.tsx`:
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

interface Patient {
  id: string
  name: string
  createdAt: string
  _count: { sessions: number }
}

export function PatientTable({ patients }: { patients: Patient[] }) {
  const [search, setSearch] = useState('')
  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-3">
      <Input placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Total Sessions</th>
              <th className="px-4 py-2">Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/patients/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-2">{p._count.sessions}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No patients found</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create patients list page**

Create `app/(protected)/patients/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { PatientTable } from '@/components/patients/patient-table'

export default async function PatientsPage() {
  const patients = await prisma.patient.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { sessions: true } } },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Patients</h1>
      <PatientTable patients={patients} />
    </div>
  )
}
```

- [ ] **Step 5: Create patient profile page**

Create `app/(protected)/patients/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function PatientPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: { serviceType: true, paymentMethod: true, medications: { include: { medication: true } } },
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!patient) notFound()

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">{patient.name}</h1>
      <p className="text-sm text-gray-500">{patient.sessions.length} session(s)</p>

      <div className="space-y-3">
        {patient.sessions.map(session => (
          <div key={session.id} className="border rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{session.serviceType.name}</span>
              <span className="text-sm text-gray-500">{new Date(session.date).toLocaleString()}</span>
            </div>
            {session.description && <p className="text-sm text-gray-600">{session.description}</p>}
            <div className="flex items-center justify-between text-sm">
              <span>{session.paymentMethod.name}</span>
              <span className="font-medium">MMK {Number(session.paymentAmount).toLocaleString()}</span>
            </div>
            {session.medications.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-0.5">
                {session.medications.map(sm => (
                  <li key={sm.id}>• {sm.medication.name} × {sm.quantity}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {patient.sessions.length === 0 && <p className="text-gray-400 text-sm">No sessions yet.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/patients app/(protected)/patients components/patients lib/validations/patient.ts
git commit -m "feat: add patient list and profile pages"
```

---

## Task 9: Patient Sessions (Integration Test)

**Files:**
- Create: `lib/validations/session.ts`
- Create: `app/api/sessions/route.ts`
- Create: `app/api/sessions/[id]/route.ts`
- Create: `components/sessions/medication-selector.tsx`
- Create: `components/sessions/session-form.tsx`
- Create: `components/sessions/session-table.tsx`
- Create: `app/(protected)/sessions/page.tsx`
- Create: `app/(protected)/sessions/new/page.tsx`
- Create: `__tests__/api/sessions.test.ts`

- [ ] **Step 1: Write failing integration tests**

Create `__tests__/api/sessions.test.ts`:
```typescript
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/sessions/route'
import { NextRequest } from 'next/server'

describe('POST /api/sessions', () => {
  let patientId: string
  let serviceTypeId: string
  let paymentMethodId: string
  let medId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Session Test Cat' } })
    const med = await prisma.medication.create({
      data: { name: 'Ibuprofen', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 10 },
    })
    medId = med.id

    const patient = await prisma.patient.create({ data: { name: 'Test Patient' } })
    patientId = patient.id

    const st = await prisma.serviceType.create({ data: { name: 'Test Service' } })
    serviceTypeId = st.id

    const pm = await prisma.paymentMethod.create({ data: { name: 'Cash' } })
    paymentMethodId = pm.id
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany()
    await prisma.patientSession.deleteMany()
    await prisma.medication.deleteMany()
    await prisma.medicationCategory.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.serviceType.deleteMany()
    await prisma.paymentMethod.deleteMany()
    await prisma.$disconnect()
  })

  it('creates session and decrements stock', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      description: 'Headache',
      paymentAmount: 5000,
      medications: [{ medicationId: medId, quantity: 3, unitCost: 1.0, sellingPrice: 2.0 }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(7) // was 10, used 3
  })

  it('rejects session if stock is insufficient', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 5000,
      medications: [{ medicationId: medId, quantity: 100, unitCost: 1.0, sellingPrice: 2.0 }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(422)

    // Stock unchanged
    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(7)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/sessions.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/sessions/route'`

- [ ] **Step 3: Write validation**

Create `lib/validations/session.ts`:
```typescript
import { z } from 'zod'

export const sessionMedicationSchema = z.object({
  medicationId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
})

export const createSessionSchema = z.object({
  patientId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  date: z.string().datetime(),
  description: z.string().optional(),
  paymentAmount: z.number().nonnegative(),
  medications: z.array(sessionMedicationSchema),
})
```

- [ ] **Step 4: Write sessions GET/POST route**

Create `app/api/sessions/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSessionSchema } from '@/lib/validations/session'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const patientId = params.get('patientId')
  const serviceTypeId = params.get('serviceTypeId')
  const from = params.get('from')
  const to = params.get('to')

  const sessions = await prisma.patientSession.findMany({
    where: {
      ...(patientId && { patientId }),
      ...(serviceTypeId && { serviceTypeId }),
      ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { medications, ...sessionData } = parsed.data

  // Check stock for all medications before transacting
  for (const med of medications) {
    const medication = await prisma.medication.findUnique({ where: { id: med.medicationId } })
    if (!medication) return NextResponse.json({ error: `Medication ${med.medicationId} not found` }, { status: 404 })
    if (medication.stock < med.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${medication.name}: have ${medication.stock}, need ${med.quantity}` },
        { status: 422 }
      )
    }
  }

  const session = await prisma.$transaction(async tx => {
    const created = await tx.patientSession.create({
      data: {
        patientId: sessionData.patientId,
        serviceTypeId: sessionData.serviceTypeId,
        paymentMethodId: sessionData.paymentMethodId,
        date: new Date(sessionData.date),
        description: sessionData.description,
        paymentAmount: sessionData.paymentAmount,
        medications: {
          create: medications.map(m => ({
            medicationId: m.medicationId,
            quantity: m.quantity,
            unitCost: m.unitCost,
            sellingPrice: m.sellingPrice,
          })),
        },
      },
      include: {
        patient: true,
        serviceType: true,
        paymentMethod: true,
        medications: { include: { medication: true } },
      },
    })

    // Decrement stock for each medication
    await Promise.all(
      medications.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { decrement: m.quantity } },
        })
      )
    )

    return created
  })

  return NextResponse.json(session, { status: 201 })
}
```

- [ ] **Step 5: Write sessions [id] route**

Create `app/api/sessions/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await prisma.patientSession.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // Restore stock before deleting
  const session = await prisma.patientSession.findUnique({
    where: { id: params.id },
    include: { medications: true },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async tx => {
    await Promise.all(
      session.medications.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { increment: m.quantity } },
        })
      )
    )
    await tx.patientSession.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/sessions.test.ts --no-coverage
```

Expected: PASS (both tests)

- [ ] **Step 7: Create MedicationSelector component**

Create `components/sessions/medication-selector.tsx`:
```typescript
'use client'

import { useFieldArray, Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Medication { id: string; name: string; cost: number; sellingPrice: number }

export function MedicationSelector({ control, medications, setValue }: {
  control: Control<any>
  medications: Medication[]
  setValue: any
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medications' })

  function handleMedChange(index: number, medId: string) {
    setValue(`medications.${index}.medicationId`, medId)
    const med = medications.find(m => m.id === medId)
    if (med) {
      setValue(`medications.${index}.unitCost`, med.cost)
      setValue(`medications.${index}.sellingPrice`, med.sellingPrice)
    }
  }

  return (
    <div className="space-y-3">
      <Label>Medications Used</Label>
      {fields.map((field, i) => (
        <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
          <div>
            <Select onValueChange={v => handleMedChange(i, v)}>
              <SelectTrigger><SelectValue placeholder="Select med…" /></SelectTrigger>
              <SelectContent>
                {medications.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Input type="number" placeholder="Qty" {...control.register(`medications.${i}.quantity`, { valueAsNumber: true })} />
          </div>
          <div>
            <Input type="number" step="0.01" placeholder="Unit cost" {...control.register(`medications.${i}.unitCost`, { valueAsNumber: true })} />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ medicationId: '', quantity: 1, unitCost: 0, sellingPrice: 0 })}>
        + Add Medication
      </Button>
    </div>
  )
}
```

- [ ] **Step 8: Create SessionForm component**

Create `components/sessions/session-form.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MedicationSelector } from './medication-selector'

const schema = z.object({
  patientId: z.string().min(1, 'Patient required'),
  newPatientName: z.string().optional(),
  serviceTypeId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional(),
  paymentAmount: z.coerce.number().nonnegative(),
  medications: z.array(z.object({
    medicationId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().nonnegative(),
    sellingPrice: z.coerce.number().nonnegative(),
  })),
})

type FormData = z.infer<typeof schema>

interface Patient { id: string; name: string }
interface ServiceType { id: string; name: string }
interface PaymentMethod { id: string; name: string }
interface Medication { id: string; name: string; cost: number; sellingPrice: number }

interface Props {
  patients: Patient[]
  serviceTypes: ServiceType[]
  paymentMethods: PaymentMethod[]
  medications: Medication[]
}

export function SessionForm({ patients, serviceTypes, paymentMethods, medications }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isNewPatient, setIsNewPatient] = useState(false)

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 16),
      medications: [],
    },
  })

  async function onSubmit(data: FormData) {
    setError('')
    let patientId = data.patientId

    // Create new patient if needed
    if (isNewPatient && data.newPatientName) {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.newPatientName }),
      })
      if (!res.ok) { setError('Failed to create patient'); return }
      const patient = await res.json()
      patientId = patient.id
    }

    const body = {
      patientId,
      serviceTypeId: data.serviceTypeId,
      paymentMethodId: data.paymentMethodId,
      date: new Date(data.date).toISOString(),
      description: data.description,
      paymentAmount: data.paymentAmount,
      medications: data.medications,
    }

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      router.push('/sessions')
    } else {
      const err = await res.json()
      setError(err.error ?? 'Failed to save session')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      {/* Patient */}
      <div className="space-y-1">
        <Label>Patient</Label>
        <div className="flex gap-2">
          {!isNewPatient ? (
            <Select onValueChange={v => setValue('patientId', v)}>
              <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
              <SelectContent>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="New patient name" {...register('newPatientName')} />
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => { setIsNewPatient(v => !v); setValue('patientId', '') }}>
            {isNewPatient ? 'Existing' : '+ New'}
          </Button>
        </div>
        {errors.patientId && <p className="text-xs text-red-500">{errors.patientId.message}</p>}
      </div>

      {/* Service Type */}
      <div className="space-y-1">
        <Label>Service Type</Label>
        <Select onValueChange={v => setValue('serviceTypeId', v)}>
          <SelectTrigger><SelectValue placeholder="Select service…" /></SelectTrigger>
          <SelectContent>
            {serviceTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.serviceTypeId && <p className="text-xs text-red-500">Required</p>}
      </div>

      {/* Date */}
      <div className="space-y-1">
        <Label>Date & Time</Label>
        <Input type="datetime-local" {...register('date')} />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea {...register('description')} rows={2} />
      </div>

      {/* Medications */}
      <MedicationSelector control={control} medications={medications} setValue={setValue} />

      {/* Payment */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Amount (MMK)</Label>
          <Input type="number" {...register('paymentAmount')} />
        </div>
        <div className="space-y-1">
          <Label>Payment Method</Label>
          <Select onValueChange={v => setValue('paymentMethodId', v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>Save Session</Button>
    </form>
  )
}
```

- [ ] **Step 9: Create SessionTable component**

Create `components/sessions/session-table.tsx`:
```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  patient: { id: string; name: string }
  serviceType: { name: string }
  paymentMethod: { name: string }
  date: string
  paymentAmount: number
  medications: Array<{ medication: { name: string }; quantity: number }>
}

export function SessionTable({ sessions }: { sessions: Session[] }) {
  const [search, setSearch] = useState('')
  const filtered = sessions.filter(s =>
    s.patient.name.toLowerCase().includes(search.toLowerCase()) ||
    s.serviceType.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <input
        className="border rounded px-3 py-1.5 text-sm w-64"
        placeholder="Search by patient or service…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Medications</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/patients/${s.patient.id}`} className="hover:underline">{s.patient.name}</Link>
                </td>
                <td className="px-4 py-2">{s.serviceType.name}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {s.medications.map(m => `${m.medication.name} ×${m.quantity}`).join(', ') || '—'}
                </td>
                <td className="px-4 py-2">{s.paymentMethod.name}</td>
                <td className="px-4 py-2 font-medium">{Number(s.paymentAmount).toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No sessions found</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Create sessions pages**

Create `app/(protected)/sessions/page.tsx`:
```typescript
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SessionTable } from '@/components/sessions/session-table'

export default async function SessionsPage() {
  const sessions = await prisma.patientSession.findMany({
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Button asChild><Link href="/sessions/new">New Session</Link></Button>
      </div>
      <SessionTable sessions={sessions} />
    </div>
  )
}
```

Create `app/(protected)/sessions/new/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/session-form'

export default async function NewSessionPage() {
  const [patients, serviceTypes, paymentMethods, medications] = await Promise.all([
    prisma.patient.findMany({ orderBy: { name: 'asc' } }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.medication.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Session</h1>
      <SessionForm
        patients={patients}
        serviceTypes={serviceTypes}
        paymentMethods={paymentMethods}
        medications={medications.map(m => ({ id: m.id, name: m.name, cost: Number(m.cost), sellingPrice: Number(m.sellingPrice) }))}
      />
    </div>
  )
}
```

- [ ] **Step 11: Commit**

```bash
git add app/api/sessions app/(protected)/sessions components/sessions lib/validations/session.ts __tests__/api/sessions.test.ts
git commit -m "feat: add patient session management with stock deduction transaction (tested)"
```

---

## Task 10: Expenses

**Files:**
- Create: `lib/validations/expense.ts`
- Create: `app/api/expenses/route.ts`
- Create: `app/api/expenses/[id]/route.ts`
- Create: `components/expenses/expense-table.tsx`
- Create: `components/expenses/expense-form.tsx`
- Create: `app/(protected)/expenses/page.tsx`
- Create: `app/(protected)/expenses/new/page.tsx`

- [ ] **Step 1: Write validation**

Create `lib/validations/expense.ts`:
```typescript
import { z } from 'zod'

export const createExpenseSchema = z.object({
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().datetime(),
})

export const updateExpenseSchema = createExpenseSchema.partial()
```

- [ ] **Step 2: Write expenses routes**

Create `app/api/expenses/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createExpenseSchema } from '@/lib/validations/expense'

export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const expense = await prisma.expense.create({
    data: {
      type: 'MANUAL',
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      categoryId: parsed.data.categoryId ?? null,
    },
    include: { category: true },
  })
  return NextResponse.json(expense, { status: 201 })
}
```

Create `app/api/expenses/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type === 'RESTOCK') return NextResponse.json({ error: 'Cannot edit restock expenses' }, { status: 403 })

  const body = await req.json()
  const parsed = updateExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: { ...parsed.data, date: parsed.data.date ? new Date(parsed.data.date) : undefined },
    include: { category: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type === 'RESTOCK') return NextResponse.json({ error: 'Cannot delete restock expenses' }, { status: 403 })

  await prisma.expense.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create ExpenseTable component**

Create `components/expenses/expense-table.tsx`:
```typescript
'use client'

import { Badge } from '@/components/ui/badge'

interface Expense {
  id: string
  type: 'RESTOCK' | 'MANUAL'
  category: { name: string } | null
  amount: number
  description: string | null
  date: string
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <Badge variant={e.type === 'RESTOCK' ? 'secondary' : 'outline'}>{e.type}</Badge>
              </td>
              <td className="px-4 py-2">{e.category?.name ?? '—'}</td>
              <td className="px-4 py-2 text-gray-500">{e.description ?? '—'}</td>
              <td className="px-4 py-2 text-right font-medium">{Number(e.amount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No expenses yet</p>}
    </div>
  )
}
```

- [ ] **Step 4: Create ExpenseForm component**

Create `components/expenses/expense-form.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const schema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  date: z.string().min(1),
})

type FormData = z.infer<typeof schema>

interface Category { id: string; name: string }

export function ExpenseForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })

  async function onSubmit(data: FormData) {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
    })
    if (res.ok) router.push('/expenses')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Category</Label>
        <Select onValueChange={v => setValue('categoryId', v)}>
          <SelectTrigger><SelectValue placeholder="Select category (optional)" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Amount</Label>
        <Input type="number" step="0.01" {...register('amount')} />
        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Date</Label>
        <Input type="date" {...register('date')} />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea {...register('description')} rows={2} />
      </div>
      <Button type="submit" disabled={isSubmitting}>Save Expense</Button>
    </form>
  )
}
```

- [ ] **Step 5: Create expenses pages**

Create `app/(protected)/expenses/page.tsx`:
```typescript
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ExpenseTable } from '@/components/expenses/expense-table'

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button asChild><Link href="/expenses/new">Add Expense</Link></Button>
      </div>
      <ExpenseTable expenses={expenses} />
    </div>
  )
}
```

Create `app/(protected)/expenses/new/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { ExpenseForm } from '@/components/expenses/expense-form'

export default async function NewExpensePage() {
  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/expenses app/(protected)/expenses components/expenses lib/validations/expense.ts
git commit -m "feat: add expenses list and manual expense creation"
```

---

## Task 11: Dashboard (Integration Test)

**Files:**
- Create: `app/api/dashboard/route.ts`
- Create: `components/dashboard/summary-cards.tsx`
- Create: `components/dashboard/low-stock-list.tsx`
- Modify: `app/(protected)/dashboard/page.tsx`
- Create: `__tests__/api/dashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/dashboard.test.ts`:
```typescript
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/dashboard/route'
import { NextRequest } from 'next/server'

describe('GET /api/dashboard', () => {
  let medId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Dash Cat' } })
    const med = await prisma.medication.create({
      data: { name: 'Aspirin', categoryId: cat.id, cost: 1.0, sellingPrice: 3.0, stock: 5, threshold: 10 },
    })
    medId = med.id

    const patient = await prisma.patient.create({ data: { name: 'Dash Patient' } })
    const st = await prisma.serviceType.create({ data: { name: 'Dash Service' } })
    const pm = await prisma.paymentMethod.create({ data: { name: 'Dash Cash' } })

    // Session this month
    await prisma.patientSession.create({
      data: {
        patientId: patient.id,
        serviceTypeId: st.id,
        paymentMethodId: pm.id,
        date: new Date(),
        paymentAmount: 10000,
        medications: {
          create: [{ medicationId: medId, quantity: 2, unitCost: 1.0, sellingPrice: 3.0 }],
        },
      },
    })

    // Manual expense this month
    const expCat = await prisma.expenseCategory.create({ data: { name: 'Dash Expense Cat' } })
    await prisma.expense.create({
      data: { type: 'MANUAL', amount: 3000, date: new Date(), categoryId: expCat.id },
    })

    // Restock expense this month (should NOT appear in adjustedExpenses)
    const restockBatch = await prisma.restockBatch.create({ data: { date: new Date() } })
    await prisma.expense.create({
      data: { type: 'RESTOCK', amount: 5000, date: new Date(), restockBatchId: restockBatch.id },
    })
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany()
    await prisma.patientSession.deleteMany()
    await prisma.expense.deleteMany()
    await prisma.restockBatch.deleteMany()
    await prisma.medication.deleteMany()
    await prisma.medicationCategory.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.serviceType.deleteMany()
    await prisma.paymentMethod.deleteMany()
    await prisma.expenseCategory.deleteMany()
    await prisma.$disconnect()
  })

  it('returns correct monthly figures, excludes restock from adjustedExpenses', async () => {
    const req = new NextRequest('http://localhost/api/dashboard')
    const res = await GET(req)
    const data = await res.json()

    expect(data.revenue).toBe(10000)
    expect(data.inventoryCost).toBe(2)   // 2 * 1.0
    expect(data.adjustedExpenses).toBe(3000) // MANUAL only
    expect(data.netProfit).toBe(10000 - 2 - 3000) // 6998
  })

  it('includes low-stock medications', async () => {
    const req = new NextRequest('http://localhost/api/dashboard')
    const res = await GET(req)
    const data = await res.json()

    // Aspirin stock=5, threshold=10 → should appear
    expect(data.lowStock.some((m: any) => m.id === medId)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/dashboard.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/dashboard/route'`

- [ ] **Step 3: Write dashboard API route**

Create `app/api/dashboard/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [sessions, expenses, lowStock] = await Promise.all([
    prisma.patientSession.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { medications: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    // Prisma can't compare two columns in where — use raw SQL
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold
    `,
  ])

  const revenue = sessions.reduce((sum, s) => sum + Number(s.paymentAmount), 0)

  const inventoryCost = sessions.reduce((sum, s) =>
    sum + s.medications.reduce((mSum, m) => mSum + m.quantity * Number(m.unitCost), 0), 0
  )

  const adjustedExpenses = expenses
    .filter(e => e.type === 'MANUAL')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const netProfit = revenue - inventoryCost - adjustedExpenses

  return NextResponse.json({ revenue, inventoryCost, adjustedExpenses, netProfit, lowStock })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/dashboard.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create SummaryCards component**

Create `components/dashboard/summary-cards.tsx`:
```typescript
interface Stats {
  revenue: number
  inventoryCost: number
  adjustedExpenses: number
  netProfit: number
}

export function SummaryCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Revenue', value: stats.revenue, color: 'text-green-600' },
    { label: 'Inventory Cost', value: stats.inventoryCost, color: 'text-blue-600' },
    { label: 'Adjusted Expenses', value: stats.adjustedExpenses, color: 'text-orange-600' },
    { label: 'Net Profit', value: stats.netProfit, color: stats.netProfit >= 0 ? 'text-green-700' : 'text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white border rounded-lg p-4 space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{Number(card.value).toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create LowStockList component**

Create `components/dashboard/low-stock-list.tsx`:
```typescript
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface LowStockMed {
  id: string
  name: string
  stock: number
  threshold: number
}

export function LowStockList({ items }: { items: LowStockMed[] }) {
  if (items.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
      <h2 className="font-semibold text-orange-800">Low Stock Alerts ({items.length})</h2>
      <ul className="space-y-1">
        {items.map(med => (
          <li key={med.id} className="flex items-center justify-between text-sm">
            <Link href="/inventory" className="hover:underline text-orange-700">{med.name}</Link>
            <span className="text-orange-600">
              {med.stock} / {med.threshold} <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">restock</Badge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 7: Update dashboard page**

Replace `app/(protected)/dashboard/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LowStockList } from '@/components/dashboard/low-stock-list'

export default async function DashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [sessions, expenses, lowStockMeds] = await Promise.all([
    prisma.patientSession.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { medications: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    // Prisma can't compare two columns in where — use raw SQL
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold
    `,
  ])

  const revenue = sessions.reduce((sum, s) => sum + Number(s.paymentAmount), 0)
  const inventoryCost = sessions.reduce((sum, s) =>
    sum + s.medications.reduce((mSum, m) => mSum + m.quantity * Number(m.unitCost), 0), 0
  )
  const adjustedExpenses = expenses.filter(e => e.type === 'MANUAL').reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = revenue - inventoryCost - adjustedExpenses

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — {monthName}</h1>
      <LowStockList items={lowStockMeds} />
      <SummaryCards stats={{ revenue, inventoryCost, adjustedExpenses, netProfit }} />
    </div>
  )
}
```

- [ ] **Step 8: Run all tests**

```bash
DATABASE_URL=$DATABASE_TEST_URL npx jest --no-coverage
```

Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add app/api/dashboard app/(protected)/dashboard components/dashboard __tests__/api/dashboard.test.ts
git commit -m "feat: add dashboard with monthly summary and low-stock alerts (tested)"
```

---

## End-to-End Verification

- [ ] Run `npm run dev` and log in
- [ ] In Settings: add medication categories, service types, payment methods, expense categories
- [ ] In Inventory: add 2+ medications, then restock them via Restock page
- [ ] Verify stock incremented and a RESTOCK expense appeared in Expenses
- [ ] In Sessions: create a new session with a patient and medications — verify stock decremented
- [ ] Try creating a session with more medication than in stock — verify rejection error
- [ ] In Dashboard: verify the monthly numbers match expectations
- [ ] Verify low-stock alert appears for medications below threshold

---

## Running Tests

```bash
# Migrate test database (first time only)
DATABASE_URL=$DATABASE_TEST_URL npx prisma migrate deploy

# Run all integration tests
DATABASE_URL=$DATABASE_TEST_URL npx jest --no-coverage

# Run a specific test file
DATABASE_URL=$DATABASE_TEST_URL npx jest __tests__/api/sessions.test.ts --no-coverage
```
