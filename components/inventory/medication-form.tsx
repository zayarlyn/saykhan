'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const UNIT_TYPES = [
	{ value: 'pcs', label: 'pcs' },
	{ value: 'boxes', label: 'boxes' },
	{ value: 'pills', label: 'pills' },
	{ value: 'bottles_100_pcs', label: 'bottles (100 pcs)' },
	{ value: 'bottles_1000_pcs', label: 'bottles (1000 pcs)' },
	{ value: 'packs', label: 'packs' },
	{ value: 'sets', label: 'sets' },
	{ value: 'amp', label: 'Amp' },
	{ value: 'st', label: 'St' },
]

const schema = z.object({
	name: z.string().min(1),
	categoryId: z.string().min(1),
	unitType: z.string().default('pcs'),
	cost: z.coerce.number().positive(),
	sellingPrice: z.coerce.number().nonnegative(),
	threshold: z.coerce.number().int().nonnegative(),
})

export type MedicationFormData = z.infer<typeof schema>

interface Category {
	id: string
	name: string
}

interface Props {
	categories: Category[]
	defaultValues?: Partial<MedicationFormData>
	onSubmit: (data: MedicationFormData) => Promise<void>
	submitLabel?: string
}

export function MedicationForm({ categories, defaultValues, onSubmit, submitLabel = 'Save' }: Props) {
	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<MedicationFormData>({
		resolver: zodResolver(schema) as Resolver<MedicationFormData>,
		defaultValues: { threshold: 10, unitType: 'pcs', sellingPrice: 0, ...defaultValues },
	})

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-4 max-w-md'>
			<div className='space-y-1'>
				<Label>Name</Label>
				<Input {...register('name')} />
				{errors.name && <p className='text-xs text-red-500'>{errors.name.message}</p>}
			</div>
			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1'>
					<Label>Category</Label>
					<Select onValueChange={(v) => setValue('categoryId', v ?? '')} defaultValue={defaultValues?.categoryId ?? undefined}>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Select category' />
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
					<Label>Unit Type</Label>
					<Select
						onValueChange={(v) => setValue('unitType', v ?? 'pcs')}
						defaultValue={defaultValues?.unitType ?? 'pcs'}
					>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Select unit' />
						</SelectTrigger>
						<SelectContent>
							{UNIT_TYPES.map((u) => (
								<SelectItem key={u.value} value={u.value}>
									{u.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1'>
					<Label>Cost</Label>
					<Input type='number' step='0.01' {...register('cost')} />
					{errors.cost && <p className='text-xs text-red-500'>{errors.cost.message}</p>}
				</div>
				<div className='space-y-1'>
					<Label>Selling Price</Label>
					<Input type='number' step='0.01' {...register('sellingPrice')} />
					{errors.sellingPrice && <p className='text-xs text-red-500'>{errors.sellingPrice.message}</p>}
				</div>
			</div>
			<div className='space-y-1'>
				<Label>Low-Stock Threshold</Label>
				<Input type='number' {...register('threshold')} />
			</div>
			<Button type='submit' disabled={isSubmitting}>
				{submitLabel}
			</Button>
		</form>
	)
}
