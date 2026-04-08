# Session & Restock Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only detail pages for sessions and restock batches, a session edit flow, a restock history tab on the inventory page, and RESTOCK→detail links on the expenses page.

**Architecture:** Server-component detail pages load data via Prisma directly; client-component edit pages use `useParams` + fetch. Session edit reuses the existing `SessionForm` with a new `onSubmitOverride` prop. Restock detail is read-only. A new `InventoryTabs` client component adds the Restocks tab to the inventory page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, Tailwind CSS, shadcn components, Zod, React Hook Form

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `components/sessions/session-table.tsx` | Row click → `/sessions/[id]` |
| Create | `app/(protected)/sessions/[id]/page.tsx` | Session detail (read-only) |
| Modify | `lib/validations/session.ts` | Add `updateSessionSchema` |
| Modify | `app/api/sessions/[id]/route.ts` | Add PATCH handler |
| Modify | `__tests__/api/sessions.test.ts` | Tests for PATCH |
| Modify | `components/sessions/patient-combobox.tsx` | Add `defaultPatient` prop |
| Modify | `components/sessions/session-form.tsx` | Add `defaultValues` + `onSubmitOverride` props |
| Create | `app/(protected)/sessions/[id]/edit/page.tsx` | Session edit form |
| Modify | `app/api/restock/route.ts` | Add GET list handler |
| Create | `app/api/restock/[id]/route.ts` | GET single restock batch |
| Modify | `__tests__/api/restock.test.ts` | Tests for new GET endpoints |
| Create | `app/(protected)/inventory/restock/[id]/page.tsx` | Restock detail (read-only) |
| Create | `components/inventory/inventory-tabs.tsx` | Client tab switcher for inventory |
| Modify | `app/(protected)/inventory/page.tsx` | Add Restocks tab |
| Modify | `components/expenses/expense-table.tsx` | Link RESTOCK expenses to detail |
| Modify | `app/(protected)/expenses/page.tsx` | Include `restockBatchId` in passed data |

---

## Task 1: Make session table rows clickable

**Files:**
- Modify: `components/sessions/session-table.tsx`

- [ ] **Step 1: Add `useRouter` and row click handler**

Replace the mobile card `div` and desktop `tr` with clickable versions. Open `components/sessions/session-table.tsx` and apply these changes:

Add import at top:
```tsx
import { useRouter } from 'next/navigation'
```

Add inside the component body (after the `filtered` declaration):
```tsx
const router = useRouter()
```

Replace the mobile card outer `div` (line 36):
```tsx
<div
  key={s.id}
  className="bg-white border rounded-lg p-3 space-y-1.5 cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/sessions/${s.id}`)}
>
```

Replace the desktop `tr` (line 72):
```tsx
<tr key={s.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/sessions/${s.id}`)}>
```

Stop the patient link from bubbling on desktop (line 74):
```tsx
<td className="px-4 py-2" onClick={e => e.stopPropagation()}>
  <Link href={`/patients/${s.patient.id}`} className="hover:underline">{s.patient.name}</Link>
</td>
```

Stop the patient link from bubbling on mobile (line 38):
```tsx
<div className="flex items-start justify-between gap-2" onClick={e => e.stopPropagation()}>
  <Link href={`/patients/${s.patient.id}`} className="font-medium text-sm hover:underline">
```

- [ ] **Step 2: Verify dev server compiles**

Run: `npm run dev` (then Ctrl+C)  
Expected: No TypeScript errors in session-table.tsx

- [ ] **Step 3: Commit**

```bash
git add components/sessions/session-table.tsx
git commit -m "feat: make session table rows navigate to session detail"
```

---

## Task 2: Session detail page (read-only)

**Files:**
- Create: `app/(protected)/sessions/[id]/page.tsx`

The existing `GET /api/sessions/[id]` already returns the full session with `patient`, `serviceType`, `paymentMethod`, and `medications[].medication`. This page queries Prisma directly (server component) — same approach as all other protected pages.

- [ ] **Step 1: Create the detail page**

Create `app/(protected)/sessions/[id]/page.tsx`:
```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await prisma.patientSession.findUnique({
    where: { id },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
  })
  if (!session) notFound()

  const total = session.medications.reduce(
    (sum, m) => sum + m.quantity * Number(m.sellingPrice),
    0
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            <Link href={`/patients/${session.patient.id}`} className="hover:underline">
              {session.patient.name}
            </Link>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {session.serviceType.name} &middot;{' '}
            {new Date(session.date).toLocaleString()}
          </p>
        </div>
        <Link href={`/sessions/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Edit
        </Link>
      </div>

      {session.description && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{session.description}</p>
      )}

      <div>
        <h2 className="font-semibold mb-2 text-sm text-gray-700 uppercase tracking-wide">Medications</h2>
        {session.medications.length === 0 ? (
          <p className="text-sm text-gray-400">No medications recorded</p>
        ) : (
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2">Medication</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {session.medications.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2">{m.medication.name}</td>
                    <td className="px-4 py-2 text-right">{m.quantity}</td>
                    <td className="px-4 py-2 text-right">{Number(m.sellingPrice).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{(m.quantity * Number(m.sellingPrice)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t font-medium">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                  <td className="px-4 py-2 text-right">{total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">Payment method</span>
          <p className="font-medium">{session.paymentMethod.name}</p>
        </div>
        <div>
          <span className="text-gray-500">Amount paid</span>
          <p className="font-medium">{Number(session.paymentAmount).toLocaleString()} MMK</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server compiles**

Run: `npm run dev` (then Ctrl+C)  
Expected: No TypeScript errors. Navigate to `/sessions` in browser, click a row — should see the detail page.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/sessions/[id]/page.tsx"
git commit -m "feat: add session detail page"
```

---

## Task 3: PATCH /api/sessions/[id] with stock reconciliation

**Files:**
- Modify: `lib/validations/session.ts`
- Modify: `app/api/sessions/[id]/route.ts`
- Modify: `__tests__/api/sessions.test.ts`

- [ ] **Step 1: Add `updateSessionSchema` to validations**

Open `lib/validations/session.ts` and append:
```typescript
export const updateSessionSchema = createSessionSchema
```

- [ ] **Step 2: Write the failing tests first**

Open `__tests__/api/sessions.test.ts`. Add a second `describe` block after the existing one:

```typescript
import { PATCH } from '@/app/api/sessions/[id]/route'

describe('PATCH /api/sessions/[id]', () => {
  let patientId: string
  let serviceTypeId: string
  let paymentMethodId: string
  let medAId: string
  let medBId: string
  let catId: string
  let sessionId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Patch Test Cat' } })
    catId = cat.id
    const medA = await prisma.medication.create({
      data: { name: 'MedA Patch', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 10 },
    })
    medAId = medA.id
    const medB = await prisma.medication.create({
      data: { name: 'MedB Patch', categoryId: cat.id, cost: 1.0, sellingPrice: 3.0, stock: 10 },
    })
    medBId = medB.id

    const patient = await prisma.patient.create({ data: { name: 'Patch Patient' } })
    patientId = patient.id
    const st = await prisma.serviceType.create({ data: { name: 'Patch Service' } })
    serviceTypeId = st.id
    const pm = await prisma.paymentMethod.create({ data: { name: 'Patch Payment' } })
    paymentMethodId = pm.id

    // Create a session that uses 3 of medA (stock becomes 7)
    const sess = await prisma.patientSession.create({
      data: {
        patientId,
        serviceTypeId,
        paymentMethodId,
        date: new Date(),
        paymentAmount: 1000,
        medications: {
          create: [{ medicationId: medAId, quantity: 3, unitCost: 1.0, sellingPrice: 2.0 }],
        },
      },
    })
    sessionId = sess.id
    await prisma.medication.update({ where: { id: medAId }, data: { stock: { decrement: 3 } } })
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany({ where: { sessionId } })
    await prisma.patientSession.deleteMany({ where: { id: sessionId } })
    await prisma.medication.deleteMany({ where: { id: { in: [medAId, medBId] } } })
    await prisma.medicationCategory.deleteMany({ where: { id: catId } })
    await prisma.patient.deleteMany({ where: { name: 'Patch Patient' } })
    await prisma.serviceType.deleteMany({ where: { name: 'Patch Service' } })
    await prisma.paymentMethod.deleteMany({ where: { name: 'Patch Payment' } })
    await prisma.$disconnect()
  })

  it('restores old stock and deducts new stock on medication change', async () => {
    // Switch from 3x medA to 2x medB
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 2000,
      medications: [{ medicationId: medBId, quantity: 2, unitCost: 1.0, sellingPrice: 3.0 }],
    }
    const req = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: sessionId }) })
    expect(res.status).toBe(200)

    // medA stock restored: was 7, add back 3 = 10
    const medA = await prisma.medication.findUnique({ where: { id: medAId } })
    expect(medA!.stock).toBe(10)

    // medB stock deducted: was 10, subtract 2 = 8
    const medB = await prisma.medication.findUnique({ where: { id: medBId } })
    expect(medB!.stock).toBe(8)
  })

  it('returns 404 for non-existent session', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 0,
      medications: [],
    }
    const req = new NextRequest('http://localhost/api/sessions/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test -- __tests__/api/sessions.test.ts
```
Expected: FAIL — `PATCH is not a function` (not exported yet)

- [ ] **Step 4: Implement PATCH handler**

Open `app/api/sessions/[id]/route.ts` and add after the `DELETE` export:

```typescript
import { updateSessionSchema } from '@/lib/validations/session'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const existing = await prisma.patientSession.findUnique({
    where: { id },
    include: { medications: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { medications: newMeds, ...sessionFields } = parsed.data

  const updated = await prisma.$transaction(async tx => {
    // Restore stock for old medications
    await Promise.all(
      existing.medications.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { increment: m.quantity } },
        })
      )
    )
    // Delete old session medications
    await tx.sessionMedication.deleteMany({ where: { sessionId: id } })

    // Create new session medications and deduct stock
    await Promise.all([
      tx.sessionMedication.createMany({
        data: newMeds.map(m => ({
          sessionId: id,
          medicationId: m.medicationId,
          quantity: m.quantity,
          unitCost: m.unitCost,
          sellingPrice: m.sellingPrice,
        })),
      }),
      ...newMeds.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { decrement: m.quantity } },
        })
      ),
    ])

    return tx.patientSession.update({
      where: { id },
      data: {
        patientId: sessionFields.patientId,
        serviceTypeId: sessionFields.serviceTypeId,
        paymentMethodId: sessionFields.paymentMethodId,
        date: new Date(sessionFields.date),
        description: sessionFields.description ?? null,
        paymentAmount: sessionFields.paymentAmount,
      },
      include: {
        patient: true,
        serviceType: true,
        paymentMethod: true,
        medications: { include: { medication: true } },
      },
    })
  })

  return NextResponse.json(updated)
}
```

Also add the import at the top of the file (with the existing imports):
```typescript
import { updateSessionSchema } from '@/lib/validations/session'
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- __tests__/api/sessions.test.ts
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/validations/session.ts "app/api/sessions/[id]/route.ts" __tests__/api/sessions.test.ts
git commit -m "feat: add PATCH /api/sessions/[id] with stock reconciliation"
```

---

## Task 4: Update PatientCombobox and SessionForm to support edit mode

**Files:**
- Modify: `components/sessions/patient-combobox.tsx`
- Modify: `components/sessions/session-form.tsx`

- [ ] **Step 1: Add `defaultPatient` prop to PatientCombobox**

Open `components/sessions/patient-combobox.tsx`. Update the interface and initialization:

```tsx
interface PatientComboboxProps {
  patients: Patient[]
  onSelect: (patientId: string, newPatientName?: string) => void
  defaultPatient?: { id: string; name: string }
}

export function PatientCombobox({ patients, onSelect, defaultPatient }: PatientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(defaultPatient?.name ?? '')
  const [selected, setSelected] = useState<{ label: string; isNew: boolean } | null>(
    defaultPatient ? { label: defaultPatient.name, isNew: false } : null
  )
  // ... rest unchanged
```

- [ ] **Step 2: Add `defaultValues` and `onSubmitOverride` props to SessionForm**

Open `components/sessions/session-form.tsx`. Update the `Props` interface:

```tsx
interface Props {
  patients: Patient[]
  serviceTypes: ServiceType[]
  paymentMethods: PaymentMethod[]
  medications: Medication[]
  defaultValues?: {
    patientId: string
    patientName: string
    serviceTypeId: string
    paymentMethodId: string
    date: string
    description?: string
    paymentAmount: number
    medications: Array<{ medicationId: string; quantity: number; unitCost: number; sellingPrice: number }>
  }
  onSubmitOverride?: (data: FormData) => Promise<void>
}
```

Update the function signature:
```tsx
export function SessionForm({ patients, serviceTypes, paymentMethods, medications, defaultValues, onSubmitOverride }: Props) {
```

Update `useForm` initialization to merge `defaultValues`:
```tsx
const {
  register,
  handleSubmit,
  control,
  setValue,
  formState: { errors, isSubmitting },
} = useForm<FormData>({
  resolver: zodResolver(schema) as any,
  defaultValues: {
    date: new Date().toISOString().slice(0, 16),
    medications: [],
    ...defaultValues,
  },
})
```

Update the `onSubmit` function — add early branch for override mode:
```tsx
async function onSubmit(data: FormData) {
  setError('')

  if (onSubmitOverride) {
    try {
      await onSubmitOverride(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save session')
    }
    return
  }

  // ... existing POST logic unchanged below
```

Update the `PatientCombobox` usage in the JSX to pass `defaultPatient`:
```tsx
<PatientCombobox
  patients={patients}
  defaultPatient={defaultValues ? { id: defaultValues.patientId, name: defaultValues.patientName } : undefined}
  onSelect={(patientId, newPatientName) => {
    // ... existing onSelect logic unchanged
  }}
/>
```

- [ ] **Step 3: Verify dev server compiles**

Run: `npm run dev` (then Ctrl+C)  
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add components/sessions/patient-combobox.tsx components/sessions/session-form.tsx
git commit -m "feat: add defaultValues and onSubmitOverride props to SessionForm"
```

---

## Task 5: Session edit page

**Files:**
- Create: `app/(protected)/sessions/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

Create `app/(protected)/sessions/[id]/edit/page.tsx`:
```tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/session-form'

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [session, serviceTypes, paymentMethods, medications] = await Promise.all([
    prisma.patientSession.findUnique({
      where: { id },
      include: {
        patient: true,
        medications: { include: { medication: true } },
      },
    }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.medication.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!session) notFound()

  const patients = await prisma.patient.findMany({ orderBy: { name: 'asc' } })

  const defaultValues = {
    patientId: session.patientId,
    patientName: session.patient.name,
    serviceTypeId: session.serviceTypeId,
    paymentMethodId: session.paymentMethodId,
    date: new Date(session.date).toISOString().slice(0, 16),
    description: session.description ?? undefined,
    paymentAmount: Number(session.paymentAmount),
    medications: session.medications.map(m => ({
      medicationId: m.medicationId,
      quantity: m.quantity,
      unitCost: Number(m.unitCost),
      sellingPrice: Number(m.sellingPrice),
    })),
  }

  async function handleSubmit(data: any) {
    'use server'
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        date: new Date(data.date).toISOString(),
      }),
    })
    redirect(`/sessions/${id}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Session</h1>
      <SessionForm
        patients={patients}
        serviceTypes={serviceTypes}
        paymentMethods={paymentMethods}
        medications={medications.map(m => ({ id: m.id, name: m.name, cost: Number(m.cost), sellingPrice: Number(m.sellingPrice) }))}
        defaultValues={defaultValues}
        onSubmitOverride={handleSubmit}
      />
    </div>
  )
}
```

> **Note:** `onSubmitOverride` is a server action passed to the client component. The `SessionForm` must call it with `await`. Since server actions can't be passed to client components as regular props from server components without marking them `'use server'`, this is the correct Next.js 16 pattern.

- [ ] **Step 2: Verify the edit flow works end-to-end**

Run: `npm run dev`  
Navigate to a session detail page → click Edit → form should be pre-filled → save → redirects back to detail page.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/sessions/[id]/edit/page.tsx"
git commit -m "feat: add session edit page"
```

---

## Task 6: GET /api/restock list and detail endpoints

**Files:**
- Modify: `app/api/restock/route.ts`
- Create: `app/api/restock/[id]/route.ts`
- Modify: `__tests__/api/restock.test.ts`

- [ ] **Step 1: Write failing tests**

Open `__tests__/api/restock.test.ts`. Add a second `describe` block after the existing one:

```typescript
import { GET as GET_LIST } from '@/app/api/restock/route'
import { GET as GET_ONE } from '@/app/api/restock/[id]/route'

describe('GET /api/restock', () => {
  it('returns list of restock batches', async () => {
    const req = new NextRequest('http://localhost/api/restock', { method: 'GET' })
    const res = await GET_LIST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('GET /api/restock/[id]', () => {
  let batchId: string
  let categoryId2: string
  let medId2: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Get Restock Cat' } })
    categoryId2 = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Get Restock Med', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 0 },
    })
    medId2 = med.id
    const batch = await prisma.restockBatch.create({
      data: {
        date: new Date(),
        items: { create: [{ medicationId: med.id, quantity: 5, costPerUnit: 2.0 }] },
      },
    })
    batchId = batch.id
  })

  afterAll(async () => {
    await prisma.restockBatchItem.deleteMany({ where: { restockBatchId: batchId } })
    await prisma.restockBatch.deleteMany({ where: { id: batchId } })
    await prisma.medication.deleteMany({ where: { id: medId2 } })
    await prisma.medicationCategory.deleteMany({ where: { id: categoryId2 } })
    await prisma.$disconnect()
  })

  it('returns single restock batch with items', async () => {
    const req = new NextRequest(`http://localhost/api/restock/${batchId}`, { method: 'GET' })
    const res = await GET_ONE(req, { params: Promise.resolve({ id: batchId }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(batchId)
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items[0].medication.name).toBe('Get Restock Med')
  })

  it('returns 404 for non-existent batch', async () => {
    const req = new NextRequest('http://localhost/api/restock/notfound', { method: 'GET' })
    const res = await GET_ONE(req, { params: Promise.resolve({ id: 'notfound' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- __tests__/api/restock.test.ts
```
Expected: FAIL — `GET_LIST is not a function`, `GET_ONE is not exported`

- [ ] **Step 3: Add GET to restock list route**

Open `app/api/restock/route.ts`. Add before the existing `POST` function:

```typescript
export async function GET() {
  const batches = await prisma.restockBatch.findMany({
    include: {
      _count: { select: { items: true } },
      expense: { select: { amount: true } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(batches)
}
```

- [ ] **Step 4: Create restock detail API route**

Create `app/api/restock/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expense: { select: { amount: true } },
    },
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(batch)
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- __tests__/api/restock.test.ts
```
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/restock/route.ts "app/api/restock/[id]/route.ts" __tests__/api/restock.test.ts
git commit -m "feat: add GET list and detail endpoints for restock batches"
```

---

## Task 7: Restock detail page

**Files:**
- Create: `app/(protected)/inventory/restock/[id]/page.tsx`

- [ ] **Step 1: Create the restock detail page**

Create `app/(protected)/inventory/restock/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function RestockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expense: { select: { amount: true } },
    },
  })
  if (!batch) notFound()

  const totalCost = batch.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.costPerUnit),
    0
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Restock Batch</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date(batch.date).toLocaleDateString()}</p>
      </div>

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Medication</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Cost / Unit</th>
              <th className="px-4 py-2 text-right">Subtotal</th>
              <th className="px-4 py-2 text-right">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map(item => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-2">{item.medication.name}</td>
                <td className="px-4 py-2 text-right">{item.quantity}</td>
                <td className="px-4 py-2 text-right">{Number(item.costPerUnit).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  {(item.quantity * Number(item.costPerUnit)).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t font-medium">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right">Total Cost</td>
              <td className="px-4 py-2 text-right">{totalCost.toLocaleString()}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {batch.expense && (
        <p className="text-sm text-gray-500">
          Expense recorded: <span className="font-medium">{Number(batch.expense.amount).toLocaleString()} MMK</span>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify dev server compiles**

Run: `npm run dev` (then Ctrl+C)  
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/inventory/restock/[id]/page.tsx"
git commit -m "feat: add restock batch detail page"
```

---

## Task 8: Restock History tab on Inventory page

**Files:**
- Create: `components/inventory/inventory-tabs.tsx`
- Modify: `app/(protected)/inventory/page.tsx`

- [ ] **Step 1: Create the InventoryTabs client component**

Create `components/inventory/inventory-tabs.tsx`:
```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function InventoryTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'medications'

  return (
    <div className="flex gap-1 border-b">
      {(['medications', 'restocks'] as const).map(t => (
        <button
          key={t}
          onClick={() => router.push(`/inventory?tab=${t}`)}
          className={[
            'px-4 py-2 text-sm font-medium capitalize -mb-px border-b-2 transition-colors',
            tab === t
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update inventory page to support tabs**

Replace the entire contents of `app/(protected)/inventory/page.tsx` with:
```tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { MedicationTable } from '@/components/inventory/medication-table'
import { InventoryTabs } from '@/components/inventory/inventory-tabs'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'medications' } = await searchParams

  const medications =
    tab === 'medications'
      ? await prisma.medication.findMany({ include: { category: true }, orderBy: { name: 'asc' } })
      : []

  const withExpiry =
    tab === 'medications'
      ? await Promise.all(
          medications.map(async med => {
            const nearestBatch = await prisma.restockBatchItem.findFirst({
              where: { medicationId: med.id, expiryDate: { gte: new Date() } },
              orderBy: { expiryDate: 'asc' },
            })
            return {
              ...med,
              cost: Number(med.cost),
              sellingPrice: Number(med.sellingPrice),
              nearestExpiry: nearestBatch?.expiryDate?.toISOString() ?? null,
            }
          })
        )
      : []

  const restocks =
    tab === 'restocks'
      ? await prisma.restockBatch.findMany({
          include: {
            _count: { select: { items: true } },
            expense: { select: { amount: true } },
          },
          orderBy: { date: 'desc' },
        })
      : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2 shrink-0">
          <Link href="/inventory/restock"><Button variant="outline" size="sm">Restock</Button></Link>
          <Link href="/inventory/new"><Button size="sm">Add</Button></Link>
        </div>
      </div>

      <Suspense>
        <InventoryTabs />
      </Suspense>

      {tab === 'medications' && <MedicationTable medications={withExpiry} />}

      {tab === 'restocks' && (
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Total Cost</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {restocks.map(batch => (
                <tr key={batch.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(batch.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{batch._count.items}</td>
                  <td className="px-4 py-2 text-right">
                    {batch.expense ? Number(batch.expense.amount).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/inventory/restock/${batch.id}`} className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {restocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No restock batches yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify dev server**

Run: `npm run dev` (then Ctrl+C)  
Navigate to `/inventory` — should see Medications / Restocks tabs. Restocks tab should list batches with "View" links.

- [ ] **Step 4: Commit**

```bash
git add components/inventory/inventory-tabs.tsx "app/(protected)/inventory/page.tsx"
git commit -m "feat: add restock history tab to inventory page"
```

---

## Task 9: Link RESTOCK expenses to restock detail

**Files:**
- Modify: `app/(protected)/expenses/page.tsx`
- Modify: `components/expenses/expense-table.tsx`

- [ ] **Step 1: Include `restockBatchId` in expense data passed to table**

Open `app/(protected)/expenses/page.tsx`. The `Expense` model includes `restockBatchId` as a scalar — Prisma already returns it. Update the mapping line (line 18):

```tsx
<ExpenseTable
  expenses={expenses.map(e => ({
    ...e,
    amount: Number(e.amount),
    date: e.date.toISOString(),
  }))}
/>
```

No change needed here — `restockBatchId` is already spread via `...e`. Just update the `Expense` interface in the table component.

- [ ] **Step 2: Add `restockBatchId` to ExpenseTable interface and render link**

Open `components/expenses/expense-table.tsx`. Update the `Expense` interface:

```tsx
interface Expense {
  id: string
  type: 'RESTOCK' | 'MANUAL'
  category: { name: string } | null
  amount: number
  description: string | null
  date: string
  restockBatchId: string | null
}
```

Add the import at the top:
```tsx
import Link from 'next/link'
```

In the mobile card, add a "View Restock" link after the description for RESTOCK expenses:
```tsx
{e.type === 'RESTOCK' && e.restockBatchId && (
  <Link
    href={`/inventory/restock/${e.restockBatchId}`}
    className="text-xs text-blue-600 hover:underline"
    onClick={e2 => e2.stopPropagation()}
  >
    View Restock
  </Link>
)}
```

Place this inside the mobile card's inner `div`, after the description `<p>`.

In the desktop table, add a new column header after "Amount":
```tsx
<th className="px-4 py-2" />
```

Add the matching cell in each `<tr>`:
```tsx
<td className="px-4 py-2 text-right">
  {e.type === 'RESTOCK' && e.restockBatchId && (
    <Link href={`/inventory/restock/${e.restockBatchId}`} className="text-xs text-blue-600 hover:underline">
      View Restock
    </Link>
  )}
</td>
```

- [ ] **Step 3: Verify dev server**

Run: `npm run dev` (then Ctrl+C)  
Navigate to `/expenses` — RESTOCK rows should show a "View Restock" link. Click it — should navigate to the restock detail page.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/expenses/page.tsx" components/expenses/expense-table.tsx
git commit -m "feat: link RESTOCK expenses to restock detail page"
```

---

## Final Verification

- [ ] Run full test suite: `npm test` — all tests pass
- [ ] `/sessions` → click row → session detail with medications table and Edit button
- [ ] Session detail → Edit → form pre-filled → save → back to detail with updated data
- [ ] `/inventory?tab=restocks` → restock history table → click View → restock detail
- [ ] `/expenses` → RESTOCK row has "View Restock" link → navigates to correct restock detail
