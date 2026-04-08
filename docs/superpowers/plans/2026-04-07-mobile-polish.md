# Mobile Polish & Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile logout, responsive table cards on detail pages, and replace all native date inputs with styled shadcn-style calendar pickers.

**Architecture:** Three independent improvements: (1) a new client component `SignOutButton` injected into the settings server page; (2) mobile card layouts added alongside existing desktop tables in session/restock detail pages; (3) a layered set of UI components (`Popover` → `Calendar` → `DatePicker` → `DateTimePicker`) consumed by three forms.

**Tech Stack:** Next.js App Router, React Hook Form, `@base-ui/react` (already installed, used for Popover), `react-day-picker@^8`, Tailwind CSS 4, TypeScript.

---

### Task 1: SignOutButton client component + settings page integration

**Files:**
- Create: `components/layout/sign-out-button.tsx`
- Modify: `app/(protected)/settings/page.tsx`

- [ ] **Step 1: Create sign-out-button.tsx**

```tsx
// components/layout/sign-out-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  )
}
```

- [ ] **Step 2: Add SignOutButton to settings page (mobile-only)**

Replace the contents of `app/(protected)/settings/page.tsx` with:

```tsx
import { prisma } from '@/lib/prisma'
import { LookupManager } from '@/components/settings/lookup-manager'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/layout/sign-out-button'

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
      <div className="md:hidden pt-2">
        <Separator className="mb-4" />
        <SignOutButton />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`. Navigate to `/settings` on a narrow viewport — "Sign Out" button should appear at the bottom. On a wide viewport (`≥ md`) it should be hidden (sidebar has it already).

- [ ] **Step 4: Commit**

```bash
git add components/layout/sign-out-button.tsx app/(protected)/settings/page.tsx
git commit -m "feat: add mobile sign-out button to settings page"
```

---

### Task 2: Mobile card layout — session detail medications table

**Files:**
- Modify: `app/(protected)/sessions/[id]/page.tsx`

The current page has a desktop-only table. Add `md:hidden` cards above it and wrap the table in `hidden md:block`.

- [ ] **Step 1: Update session detail page**

Replace the medications section (`<div>` wrapping `<h2>` and the table) with:

```tsx
      <div>
        <h2 className="font-semibold mb-2 text-sm text-gray-700 uppercase tracking-wide">Medications</h2>
        {session.medications.length === 0 ? (
          <p className="text-sm text-gray-400">No medications recorded</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {session.medications.map(m => (
                <div key={m.id} className="rounded border bg-white p-3 text-sm">
                  <p className="font-medium">{m.medication.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    {m.quantity} × {Number(m.sellingPrice).toLocaleString()} ={' '}
                    <span className="font-medium text-gray-800">
                      {(m.quantity * Number(m.sellingPrice)).toLocaleString()} MMK
                    </span>
                  </p>
                </div>
              ))}
              <div className="rounded border bg-gray-50 p-3 text-sm font-medium flex justify-between">
                <span>Total</span>
                <span>{total.toLocaleString()} MMK</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded border overflow-hidden">
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
          </>
        )}
      </div>
```

- [ ] **Step 2: Verify manually**

Run `npm run dev`. Navigate to `/sessions/[id]`. On narrow viewport → medications shown as cards with subtotals + total card. On wide viewport → table as before.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/sessions/[id]/page.tsx"
git commit -m "feat: add mobile card layout to session detail medications"
```

---

### Task 3: Mobile card layout — restock detail items table

**Files:**
- Modify: `app/(protected)/inventory/restock/[id]/page.tsx`

- [ ] **Step 1: Update restock detail page**

Replace the `<div className="rounded border overflow-hidden">` block (the table) with:

```tsx
      <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {batch.items.map(item => (
            <div key={item.id} className="rounded border bg-white p-3 text-sm">
              <p className="font-medium">{item.medication.name}</p>
              <div className="mt-1 space-y-0.5 text-gray-500">
                <p>Qty: <span className="text-gray-800">{item.quantity}</span></p>
                <p>Cost/unit: <span className="text-gray-800">{Number(item.costPerUnit).toLocaleString()}</span></p>
                {item.expiryDate && (
                  <p>Expiry: <span className="text-gray-800">{new Date(item.expiryDate).toLocaleDateString()}</span></p>
                )}
              </div>
              <p className="mt-1 font-medium">
                Subtotal: {(item.quantity * Number(item.costPerUnit)).toLocaleString()} MMK
              </p>
            </div>
          ))}
          <div className="rounded border bg-gray-50 p-3 text-sm font-medium flex justify-between">
            <span>Total Cost</span>
            <span>{totalCost.toLocaleString()} MMK</span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded border overflow-hidden">
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
      </>
```

- [ ] **Step 2: Verify manually**

Navigate to `/inventory/restock/[id]`. On narrow viewport → items shown as cards. On wide viewport → table as before.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/inventory/restock/[id]/page.tsx"
git commit -m "feat: add mobile card layout to restock detail items"
```

---

### Task 4: Install react-day-picker and create Popover + Calendar components

**Files:**
- Install: `react-day-picker@^8`
- Create: `components/ui/popover.tsx`
- Create: `components/ui/calendar.tsx`

- [ ] **Step 1: Install react-day-picker**

```bash
npm install react-day-picker@^8
```

Expected: package.json and package-lock.json updated, no errors.

- [ ] **Step 2: Create popover.tsx**

```tsx
// components/ui/popover.tsx
'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { cn } from '@/lib/utils'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> & {
  sideOffset?: number
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
        <PopoverPrimitive.Popup
          className={cn(
            'rounded-lg border border-border bg-popover text-popover-foreground shadow-md outline-none',
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverContent, PopoverTrigger }
```

- [ ] **Step 3: Create calendar.tsx**

```tsx
// components/ui/calendar.tsx
'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col space-y-4',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors for the new files. (Ignore pre-existing errors if any.)

- [ ] **Step 5: Commit**

```bash
git add components/ui/popover.tsx components/ui/calendar.tsx package.json package-lock.json
git commit -m "feat: add Popover and Calendar UI components (react-day-picker)"
```

---

### Task 5: Create DatePicker component

**Files:**
- Create: `components/ui/date-picker.tsx`

- [ ] **Step 1: Create date-picker.tsx**

```tsx
// components/ui/date-picker.tsx
'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date' }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? formatDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/date-picker.tsx
git commit -m "feat: add DatePicker component"
```

---

### Task 6: Create DateTimePicker component

**Files:**
- Create: `components/ui/datetime-picker.tsx`

- [ ] **Step 1: Create datetime-picker.tsx**

```tsx
// components/ui/datetime-picker.tsx
'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time' }: DateTimePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? formatDateTime(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(day) => {
            if (!day) { onChange(undefined); return }
            const next = new Date(day)
            // preserve current time if value already set
            if (value) {
              next.setHours(value.getHours(), value.getMinutes(), 0, 0)
            }
            onChange(next)
          }}
          initialFocus
        />
        <div className="border-t p-3">
          <input
            type="time"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={value ? toTimeString(value) : ''}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(':').map(Number)
              const next = value ? new Date(value) : new Date()
              next.setHours(hours, minutes, 0, 0)
              onChange(next)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/datetime-picker.tsx
git commit -m "feat: add DateTimePicker component"
```

---

### Task 7: Update ExpenseForm — replace date input with DatePicker

**Files:**
- Modify: `components/expenses/expense-form.tsx`

Currently: `<Input type="date" {...register('date')} />` with `defaultValues: { date: new Date().toISOString().slice(0, 10) }`.

After: `DatePicker` with `watch`/`setValue` pattern. The form schema keeps `date: z.string().min(1)` (ISO string). The picker's `onChange` calls `setValue('date', date.toISOString())`.

- [ ] **Step 1: Update expense-form.tsx**

```tsx
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
import { DatePicker } from '@/components/ui/date-picker'

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
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString() },
  })

  const dateValue = watch('date')

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
        <Select onValueChange={(v: string | null) => setValue('categoryId', v ?? undefined)}>
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
        <DatePicker
          value={dateValue ? new Date(dateValue) : undefined}
          onChange={(date) => setValue('date', date ? date.toISOString() : '')}
        />
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/expenses/expense-form.tsx
git commit -m "feat: replace date input with DatePicker in expense form"
```

---

### Task 8: Update RestockForm — replace date inputs with pickers

**Files:**
- Modify: `components/inventory/restock-form.tsx`

Currently: `<Input type="datetime-local">` for batch date, `<Input type="date">` for per-item expiry.
After: `DateTimePicker` for batch date, `DatePicker` for per-item expiry.

- [ ] **Step 1: Update restock-form.tsx**

```tsx
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
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { DatePicker } from '@/components/ui/date-picker'

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
  const { register, handleSubmit, control, setValue, watch, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: new Date().toISOString(),
      items: [{ medicationId: '', quantity: 1, costPerUnit: 0, expiryDate: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const dateValue = watch('date')
  const itemsValue = watch('items')

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
        <DateTimePicker
          value={dateValue ? new Date(dateValue) : undefined}
          onChange={(date) => setValue('date', date ? date.toISOString() : '')}
        />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Medication</Label>
                <Select onValueChange={(v: string | null) => setValue(`items.${i}.medicationId`, v ?? '')}>
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
                <DatePicker
                  value={itemsValue[i]?.expiryDate ? new Date(itemsValue[i].expiryDate!) : undefined}
                  onChange={(date) => setValue(`items.${i}.expiryDate`, date ? date.toISOString() : '')}
                  placeholder="No expiry"
                />
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/inventory/restock-form.tsx
git commit -m "feat: replace date inputs with pickers in restock form"
```

---

### Task 9: Update SessionForm — replace datetime-local input with DateTimePicker

**Files:**
- Modify: `components/sessions/session-form.tsx`

Currently: `<Input type='datetime-local' {...register('date')} />` at line 190.
After: `DateTimePicker` using `watch`/`setValue`.

- [ ] **Step 1: Add DateTimePicker import and wire up the date field**

In `components/sessions/session-form.tsx`:

1. Add import at top:
```tsx
import { DateTimePicker } from '@/components/ui/datetime-picker'
```

2. Add `watch` to the destructured form methods (it's currently not destructured):
```tsx
const {
  register,
  handleSubmit,
  control,
  setValue,
  watch,
  formState: { errors, isSubmitting },
} = useForm<FormData>({...})
```

3. Add watch call after the useForm call:
```tsx
const dateValue = watch('date')
```

4. Replace the "Date & Time" field:
```tsx
      <div className='space-y-1'>
        <Label>Date & Time</Label>
        <DateTimePicker
          value={dateValue ? new Date(dateValue) : undefined}
          onChange={(date) => setValue('date', date ? date.toISOString() : '')}
        />
      </div>
```

5. In `defaultValues`, update the date default (already correct — `new Date().toISOString().slice(0, 16)` should become `new Date().toISOString()` for full ISO string):
```tsx
defaultValues: {
  date: new Date().toISOString(),
  medications: [],
  ...defaultValues,
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Manual end-to-end check**

Run `npm run dev`. Open `/sessions/new`:
- Date & Time field shows a calendar popover when clicked
- Selecting a date updates the field label
- Adjusting the time input updates the displayed time
- Submitting sends a valid ISO string to the API

- [ ] **Step 4: Commit**

```bash
git add components/sessions/session-form.tsx
git commit -m "feat: replace datetime-local input with DateTimePicker in session form"
```

---

## Verification Checklist

After all tasks complete, verify each spec requirement:

1. `/settings` on mobile → "Sign Out" button visible → tapping logs out → redirected to `/login`
2. `/settings` on desktop (`≥ md`) → no sign-out button (sidebar has it)
3. `/sessions/[id]` on narrow viewport → medications shown as cards with subtotals
4. `/inventory/restock/[id]` on narrow viewport → items shown as cards with subtotals
5. Expense form (`/expenses/new`) → date field opens a calendar popover → selecting a date shows formatted label
6. Restock form (`/inventory/new-restock`) → batch date opens DateTimePicker → per-item expiry opens DatePicker
7. Session form (`/sessions/new` and `/sessions/[id]/edit`) → date & time opens DateTimePicker → submitted ISO string is correct
