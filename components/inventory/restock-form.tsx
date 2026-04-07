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
