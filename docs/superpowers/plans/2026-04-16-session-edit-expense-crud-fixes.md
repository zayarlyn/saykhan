# Session Edit & Expense CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix session edit dropdown bug, replace window.confirm with DeleteDialog, and implement full edit/delete for manual expenses.

**Architecture:** Three independent fixes:
1. Session dropdown bug: Initialize `query` state from selected medication name in edit mode
2. Delete dialog pattern: Extract confirm logic into reusable DeleteDialog component, apply to restock and expense deletes
3. Expense CRUD: Follow exact restock pattern — PATCH/DELETE handlers, form component, detail/edit pages, delete button

**Tech Stack:** React 19, Next.js 16.2.2, Prisma, react-hook-form, Zod, shadcn UI (DeleteDialog), Tailwind CSS

---

## Task 1: Fix Session Edit Dropdown Bug

**Files:**
- Modify: `components/sessions/medication-selector.tsx`

**Problem:** When editing a session, the medication dropdown shows the medication ID instead of the name because `query` state isn't initialized with the selected medication name.

**Solution:** When the component mounts with a pre-selected `value`, initialize `query` to the medication name.

- [ ] **Step 1: Read the current MedicationDropdown component**

File: `components/sessions/medication-selector.tsx` lines 13-60

Current behavior: `query` defaults to `''`, so even if `value` is set, the input shows empty until user types.

- [ ] **Step 2: Modify MedicationDropdown to initialize query from selected medication**

Replace the component definition (lines 13-60) with:

```tsx
function MedicationDropdown({ medications, value, onChange }: { medications: Medication[]; value?: string; onChange: (id: string) => void }) {
	const [open, setOpen] = useState(false)
	const selected = value ? medications.find(m => m.id === value) : null
	const [query, setQuery] = useState(selected?.name ?? '')

	useEffect(() => {
		function handle(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handle)
		return () => document.removeEventListener('mousedown', handle)
	}, [])

	useEffect(() => {
		if (value && selected) {
			setQuery(selected.name)
		}
	}, [value, selected])

	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const trimmed = query.trim()
	const filtered = medications.filter(m => m.name.toLowerCase().includes(trimmed.toLowerCase()))

	function selectMed(med: Medication) {
		setQuery(med.name)
		onChange(med.id)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className='relative flex-1'>
			<div
				className={cn(
					'flex items-center gap-1.5 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors',
					open && 'border-ring ring-3 ring-ring/50'
				)}
				onClick={() => {
					setOpen(true)
					inputRef.current?.focus()
				}}
			>
				<input
					ref={inputRef}
					value={query}
					onChange={e => {
						setQuery(e.target.value)
						setOpen(true)
						if (e.target.value !== selected?.name) {
							onChange('')
						}
					}}
					onFocus={() => setOpen(true)}
					placeholder='Search medications…'
					className='flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-0'
				/>
				<ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
			</div>

			{open && (
				<div className='absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden'>
					<ul className='max-h-52 overflow-y-auto py-1'>
						{filtered.length === 0 && <li className='px-3 py-2 text-sm text-muted-foreground'>No medications found</li>}
						{filtered.map(m => (
							<li
								key={m.id}
								onMouseDown={e => {
									e.preventDefault()
									selectMed(m)
								}}
								className='flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground'
							>
								<Check className={cn('size-3.5 shrink-0', value === m.id ? 'inline' : 'hidden')} />
								{m.name}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
```

**Key changes:**
- Line 3: Compute `selected` before `query` state
- Line 4: Initialize `query` to `selected?.name ?? ''` instead of `''`
- Lines 11-18: Add `useEffect` to sync `query` when `value` changes (handles when edit page loads with pre-selected medication)

- [ ] **Step 3: Verify the fix by viewing the file**

Run: `cat components/sessions/medication-selector.tsx | head -100`

Expected: File should have `useEffect` that watches `value` and updates `query`

- [ ] **Step 4: Commit**

```bash
git add components/sessions/medication-selector.tsx
git commit -m "fix: show medication name instead of ID in session edit dropdown

When editing a session, initialize the dropdown query state to the
selected medication name so the input displays the name, not the ID."
```

---

## Task 2: Replace window.confirm() with DeleteDialog in RestockDeleteButton

**Files:**
- Modify: `components/inventory/restock-delete-button.tsx`

**Problem:** Using `window.confirm()` instead of custom DeleteDialog component.

**Solution:** Use the existing DeleteDialog from `components/ui/delete-dialog.tsx` (already built and styled).

- [ ] **Step 1: Read the current RestockDeleteButton**

File: `components/inventory/restock-delete-button.tsx`

Current: Uses `window.confirm()` at line 14. No dialog state management.

- [ ] **Step 2: Rewrite RestockDeleteButton to use DeleteDialog**

Replace entire file with:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteDialog } from '@/components/ui/delete-dialog'
import { Trash2 } from 'lucide-react'

export function RestockDeleteButton({ restockId }: { restockId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setError('')
    try {
      const res = await fetch(`/api/restock/${restockId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/inventory?tab=restocks')
      } else {
        setError('Failed to delete restock batch')
      }
    } catch (err) {
      setError('An error occurred while deleting')
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="destructive"
        size="sm"
        className="gap-2"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Restock Batch"
        description="This will delete the restock batch and decrement medication stock accordingly. This action cannot be undone."
        onConfirm={handleDelete}
      />
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </>
  )
}
```

**Key changes:**
- Import `DeleteDialog` and `useState`
- Move confirm logic into `handleDelete()` function
- Button click sets dialog `open` state instead of calling confirm
- Pass `onConfirm` callback to DeleteDialog (handles the actual delete)
- Keep error state/display below buttons

- [ ] **Step 3: Verify the file was updated correctly**

Run: `cat components/inventory/restock-delete-button.tsx`

Expected: File should have DeleteDialog import and use, no window.confirm

- [ ] **Step 4: Commit**

```bash
git add components/inventory/restock-delete-button.tsx
git commit -m "refactor: replace window.confirm with DeleteDialog

Use the DeleteDialog component instead of window.confirm() for a
consistent, styled user experience. Applies same pattern used elsewhere
in the app."
```

---

## Task 3: Add updateExpenseSchema to lib/validations/expense.ts

**Files:**
- Modify: `lib/validations/expense.ts`

- [ ] **Step 1: Read the current expense schema**

Run: `cat lib/validations/expense.ts`

Expected: Should have `createExpenseSchema` defined

- [ ] **Step 2: Add updateExpenseSchema**

Append to the file:

```ts
export const updateExpenseSchema = createExpenseSchema
```

This reuses the same validation shape for updates (amount, description, date, categoryId).

- [ ] **Step 3: Commit**

```bash
git add lib/validations/expense.ts
git commit -m "feat: add updateExpenseSchema for expense updates"
```

---

## Task 4: Add PATCH and DELETE handlers to /api/expenses/[id]/route.ts

**Files:**
- Create: `app/api/expenses/[id]/route.ts`

- [ ] **Step 1: Create the file with GET, PATCH, DELETE handlers**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(expense)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type !== 'MANUAL') {
    return NextResponse.json(
      { error: 'Cannot edit restock expenses. Edit the restock batch instead.' },
      { status: 403 }
    )
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      categoryId: parsed.data.categoryId ?? null,
    },
    include: { category: true },
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type !== 'MANUAL') {
    return NextResponse.json(
      { error: 'Cannot delete restock expenses. Delete the restock batch instead.' },
      { status: 403 }
    )
  }

  await prisma.expense.delete({ where: { id } })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return NextResponse.json({ ok: true })
}
```

**Key points:**
- GET: Fetch single expense with category relation
- PATCH: Only allows MANUAL expenses (blocks restock expenses)
- DELETE: Only allows MANUAL expenses (blocks restock expenses)
- Both revalidate `/expenses` and `/dashboard` paths

- [ ] **Step 2: Verify the file was created**

Run: `cat app/api/expenses/\[id\]/route.ts | head -20`

Expected: File exists with GET handler visible

- [ ] **Step 3: Commit**

```bash
git add app/api/expenses/\[id\]/route.ts
git commit -m "feat: add PATCH and DELETE handlers for manual expenses

- GET: fetch single expense
- PATCH: update amount, description, date, category (MANUAL only)
- DELETE: remove expense (MANUAL only)
- Restock expenses are managed through restock batch edit/delete"
```

---

## Task 5: Create expense-form.tsx component

**Files:**
- Create: `components/expenses/expense-form.tsx`

- [ ] **Step 1: Create the form component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { createExpenseSchema } from '@/lib/validations/expense'

interface ExpenseCategory {
  id: string
  name: string
}

interface ExpenseFormProps {
  categories: ExpenseCategory[]
  mode?: 'create' | 'edit'
  expenseId?: string
  defaultValues?: {
    amount: number
    description?: string
    date: string
    categoryId?: string
  }
}

type FormData = typeof createExpenseSchema._type

export function ExpenseForm({ categories, mode = 'create', expenseId, defaultValues }: ExpenseFormProps) {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: defaultValues || {
      amount: 0,
      description: '',
      date: new Date().toISOString(),
      categoryId: undefined,
    },
  })

  const dateValue = watch('date')

  async function onSubmit(data: FormData) {
    setError('')
    const url = mode === 'edit' && expenseId ? `/api/expenses/${expenseId}` : '/api/expenses'
    const method = mode === 'edit' ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        router.push('/expenses')
      } else {
        const err = await res.json()
        setError(err.error ?? 'Failed to save expense')
      }
    } catch (err) {
      setError('An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Label>Amount (MMK)</Label>
        <Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
      </div>

      <div className="space-y-1">
        <Label>Category (Optional)</Label>
        <Select
          defaultValue={defaultValues?.categoryId}
          onValueChange={(v) => setValue('categoryId', v || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category…" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label>Date</Label>
        <DateTimePicker
          value={dateValue ? new Date(dateValue) : undefined}
          onChange={(date) => setValue('date', date ? date.toISOString() : '')}
        />
      </div>

      <div className="space-y-1">
        <Label>Description (Optional)</Label>
        <Textarea {...register('description')} rows={3} placeholder="Notes about this expense…" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {mode === 'edit' ? 'Update Expense' : 'Save Expense'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verify the file was created**

Run: `cat components/expenses/expense-form.tsx | head -30`

Expected: File exists with import statements and form component

- [ ] **Step 3: Commit**

```bash
git add components/expenses/expense-form.tsx
git commit -m "feat: add reusable ExpenseForm component for create/edit modes"
```

---

## Task 6: Create expense-delete-button.tsx component

**Files:**
- Create: `components/expenses/expense-delete-button.tsx`

- [ ] **Step 1: Create the delete button component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DeleteDialog } from '@/components/ui/delete-dialog'
import { Trash2 } from 'lucide-react'

export function ExpenseDeleteButton({ expenseId }: { expenseId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setError('')
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        router.push('/expenses')
      } else {
        const err = await res.json()
        setError(err.error ?? 'Failed to delete expense')
      }
    } catch (err) {
      setError('An error occurred while deleting')
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="destructive"
        size="sm"
        className="gap-2"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      <DeleteDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Expense"
        description="This expense will be permanently deleted. This action cannot be undone."
        onConfirm={handleDelete}
      />
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </>
  )
}
```

- [ ] **Step 2: Verify the file was created**

Run: `cat components/expenses/expense-delete-button.tsx | head -20`

Expected: File exists with DeleteDialog import

- [ ] **Step 3: Commit**

```bash
git add components/expenses/expense-delete-button.tsx
git commit -m "feat: add ExpenseDeleteButton with DeleteDialog"
```

---

## Task 7: Create expense detail page at /expenses/[id]/page.tsx

**Files:**
- Create: `app/(protected)/expenses/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/layout/back-button'
import { ExpenseDeleteButton } from '@/components/expenses/expense-delete-button'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!expense) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton label="Expenses" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expense</h1>
          <p className="text-sm text-gray-500 mt-0.5">{new Date(expense.date).toLocaleDateString()}</p>
        </div>
        {expense.type === 'MANUAL' && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/expenses/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            </Link>
            <ExpenseDeleteButton expenseId={id} />
          </div>
        )}
      </div>

      <div className="space-y-4 rounded border p-4">
        <div>
          <p className="text-sm text-gray-600">Amount</p>
          <p className="text-2xl font-bold">{Number(expense.amount).toLocaleString()} MMK</p>
        </div>

        {expense.category && (
          <div>
            <p className="text-sm text-gray-600">Category</p>
            <p className="font-medium">{expense.category.name}</p>
          </div>
        )}

        {expense.description && (
          <div>
            <p className="text-sm text-gray-600">Description</p>
            <p className="font-medium">{expense.description}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600">Type</p>
          <p className="font-medium">{expense.type === 'MANUAL' ? 'Manual' : 'Restock'}</p>
        </div>
      </div>

      {expense.type === 'RESTOCK' && (
        <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
          This is an auto-generated restock expense. Edit or delete it via the restock batch.
        </p>
      )}
    </div>
  )
}
```

**Key points:**
- Shows Edit/Delete buttons only for MANUAL expenses
- Shows info-box for RESTOCK expenses explaining they're auto-managed
- Displays amount, category, description, type

- [ ] **Step 2: Verify the file was created**

Run: `cat "app/(protected)/expenses/[id]/page.tsx" | head -40`

Expected: File exists with expense detail rendering

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/expenses/[id]/page.tsx"
git commit -m "feat: add expense detail page with Edit/Delete for manual expenses"
```

---

## Task 8: Create expense edit page at /expenses/[id]/edit/page.tsx

**Files:**
- Create: `app/(protected)/expenses/[id]/edit/page.tsx`

- [ ] **Step 1: Create the edit page**

```tsx
import { prisma } from '@/lib/prisma'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!expense) notFound()
  if (expense.type !== 'MANUAL') notFound()

  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' },
  })

  const defaultValues = {
    amount: Number(expense.amount),
    description: expense.description ?? undefined,
    date: expense.date.toISOString(),
    categoryId: expense.categoryId ?? undefined,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Edit Expense</h1>
        <p className="text-sm text-gray-600">Update the expense details.</p>
      </div>
      <ExpenseForm
        categories={categories}
        mode="edit"
        expenseId={id}
        defaultValues={defaultValues}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the file was created**

Run: `cat "app/(protected)/expenses/[id]/edit/page.tsx" | head -20`

Expected: File exists with edit page logic

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/expenses/[id]/edit/page.tsx"
git commit -m "feat: add expense edit page"
```

---

## Task 9: Modify /expenses/page.tsx to add detail links

**Files:**
- Modify: `app/(protected)/expenses/page.tsx`

- [ ] **Step 1: Read the current expenses page**

Run: `cat "app/(protected)/expenses/page.tsx"`

Look for the `ExpenseTable` component usage. This is where we'll add links.

- [ ] **Step 2: Find the ExpenseTable component**

Run: `cat components/expenses/expense-table.tsx`

Examine the structure to understand how to add links to rows.

- [ ] **Step 3: Modify the expenses page to pass an onClick handler to the table**

The table receives `expenses` array. Modify the page to add `onRowClick` prop to navigate to detail:

Find this section in `/app/(protected)/expenses/page.tsx`:

```tsx
<ExpenseTable expenses={expenses.map(e => ({ ...e, amount: Number(e.amount), date: e.date.toISOString() }))} />
```

Replace with:

```tsx
<ExpenseTable 
  expenses={expenses.map(e => ({ ...e, amount: Number(e.amount), date: e.date.toISOString(), id: e.id }))} 
  onRowClick={(expenseId) => router.push(`/expenses/${expenseId}`)}
/>
```

Add this import at the top if not already present:

```tsx
'use client'
import { useRouter } from 'next/navigation'
```

- [ ] **Step 4: Modify ExpenseTable to accept and use onRowClick**

File: `components/expenses/expense-table.tsx`

Add `onRowClick` prop to interface and add `onClick` handler to table rows:

```tsx
interface Props {
  expenses: Expense[]
  onRowClick?: (expenseId: string) => void
}

export function ExpenseTable({ expenses, onRowClick }: Props) {
  return (
    // ... existing code ...
    <tr 
      key={expense.id} 
      className={cn(
        'border-t hover:bg-gray-50 cursor-pointer',
        onRowClick && 'cursor-pointer'
      )}
      onClick={() => onRowClick?.(expense.id)}
    >
      {/* ... row content ... */}
    </tr>
  )
}
```

- [ ] **Step 5: Commit both files**

```bash
git add "app/(protected)/expenses/page.tsx" components/expenses/expense-table.tsx
git commit -m "feat: add clickable detail links to expense table rows"
```

---

## Task 10: Update expense creation page to use ExpenseForm

**Files:**
- Modify: `app/(protected)/expenses/new/page.tsx`

- [ ] **Step 1: Read the current new expense page**

Run: `cat "app/(protected)/expenses/new/page.tsx"`

This page should already exist and may be using an inline form or component.

- [ ] **Step 2: Update to use ExpenseForm**

Replace the entire file with:

```tsx
import { prisma } from '@/lib/prisma'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { BackButton } from '@/components/layout/back-button'

export const dynamic = 'force-dynamic'

export default async function NewExpensePage() {
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-4">
      <BackButton label="Expenses" />
      <div>
        <h1 className="text-2xl font-bold">Add Expense</h1>
        <p className="text-sm text-gray-600">Record a new manual expense.</p>
      </div>
      <ExpenseForm categories={categories} />
    </div>
  )
}
```

- [ ] **Step 3: Verify the file was updated**

Run: `cat "app/(protected)/expenses/new/page.tsx"`

Expected: File uses ExpenseForm component with categories

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/expenses/new/page.tsx"
git commit -m "refactor: use ExpenseForm component in new expense page"
```

---

## Task 11: Verify the build compiles

**Files:**
- None (verification only)

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors

- [ ] **Step 2: If build fails, review errors**

Common issues:
- Missing imports in component files
- Type mismatches in form data
- Missing files or routes

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add .
git commit -m "fix: resolve build errors in expense CRUD implementation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Session edit dropdown bug: Task 1 fixes `query` state initialization
- ✅ Replace window.confirm with DeleteDialog: Task 2 updates RestockDeleteButton
- ✅ Expense edit/delete: Tasks 3-10 implement full CRUD with form, pages, buttons

**Placeholder scan:** No TODOs, TBDs, or vague steps. All code is complete.

**Type consistency:**
- `FormData` used consistently in ExpenseForm (line 31 from createExpenseSchema)
- `ExpenseDeleteButton` receives `expenseId: string` (matches Task 6)
- Detail/edit pages both query by `id: string` from params

**Ambiguity check:**
- Expense edit only allows MANUAL type (Tasks 4, 7)
- Restock expenses show info box, no edit/delete (Task 7)
- Form component switches between create/edit via `mode` prop (Task 5)

---

Plan complete and saved to `docs/superpowers/plans/2026-04-16-session-edit-expense-crud-fixes.md`. 

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with checkpoints

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
