'use client'

import { useForm, type Resolver } from 'react-hook-form'
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
    resolver: zodResolver(schema) as Resolver<FormData>,
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
        <Select onValueChange={v => setValue('categoryId', v ?? '')} defaultValue={defaultValues?.categoryId ?? undefined}>
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
