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
import { DateTimePicker } from '@/components/ui/datetime-picker'

const schema = z.object({
	categoryId: z.string().optional().nullable(),
	amount: z.coerce.number().positive(),
	description: z.string().optional(),
	date: z.string().min(1),
})

type FormData = z.infer<typeof schema>

interface Category {
	id: string
	name: string
}

interface Props {
	categories: Category[]
	mode?: 'create' | 'edit'
	expenseId?: string
	defaultValues?: {
		categoryId?: string | null
		amount: number
		description?: string
		date: string
	}
}

export function ExpenseForm({ categories, mode = 'create', expenseId, defaultValues }: Props) {
	const router = useRouter()
	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema) as any,
		defaultValues: defaultValues || { date: new Date().toISOString() },
	})

	const dateValue = watch('date')
	const categoryId = watch('categoryId')

	async function onSubmit(data: FormData) {
		if (mode === 'create') {
			const res = await fetch('/api/expenses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
			})
			if (res.ok) router.push('/expenses')
		} else if (mode === 'edit' && expenseId) {
			const res = await fetch(`/api/expenses/${expenseId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
			})
			if (res.ok) router.push('/expenses')
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-4 max-w-md'>
			<div className='space-y-1'>
				<Label>Category</Label>
				<Select value={categoryId ?? ''} onValueChange={(v: string | null) => setValue('categoryId', v ?? null)} initialLabels={Object.fromEntries(categories.map(c => [c.id, c.name]))}>
					<SelectTrigger className='w-full'>
						<SelectValue placeholder='Select category…' />
					</SelectTrigger>
					<SelectContent>
						{categories.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.categoryId && <p className='text-xs text-red-500'>{errors.categoryId.message}</p>}
			</div>
			<div className='space-y-1'>
				<Label>Amount</Label>
				<Input type='number' step='0.01' {...register('amount')} />
				{errors.amount && <p className='text-xs text-red-500'>{errors.amount.message}</p>}
			</div>
			<div className='space-y-1'>
				<Label>Date</Label>
				<DateTimePicker value={dateValue ? new Date(dateValue) : undefined} onChange={(date) => setValue('date', date ? date.toISOString() : '')} />
			</div>
			<div className='space-y-1'>
				<Label>Description</Label>
				<Textarea {...register('description')} rows={2} />
			</div>
			<Button type='submit' disabled={isSubmitting}>
				{mode === 'create' ? 'Create Expense' : 'Update Expense'}
			</Button>
		</form>
	)
}
