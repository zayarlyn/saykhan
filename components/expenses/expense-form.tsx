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
