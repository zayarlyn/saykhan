'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { DatePicker } from '@/components/ui/date-picker'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
	date: z.string().min(1),
	items: z
		.array(
			z.object({
				medicationId: z.string().min(1),
				quantity: z.coerce.number().int().positive(),
				costPerUnit: z.coerce.number().positive(),
				expiryDate: z.string().optional(),
			})
		)
		.min(1),
})

type FormData = z.infer<typeof schema>

interface Medication {
	id: string
	name: string
}

interface MedicationSelectorProps {
	medications: Medication[]
	value?: string
	onChange: (medicationId: string) => void
}

function MedicationSelector({ medications, value, onChange }: MedicationSelectorProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		function handle(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handle)
		return () => document.removeEventListener('mousedown', handle)
	}, [])

	const trimmed = query.trim()
	console.log(medications)
	const filtered = medications.filter((m) => m.name.toLowerCase().includes(trimmed.toLowerCase()))
	const selected = value ? medications.find((m) => m.id === value) : null

	function selectMedication(med: Medication) {
		setQuery(med.name)
		onChange(med.id)
		setOpen(false)
	}

	return (
		<div ref={containerRef} className='relative w-full'>
			<div
				className={cn(
					'flex items-center gap-1.5 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors',
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
					onChange={(e) => {
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
						{filtered.map((m) => (
							<li
								key={m.id}
								onMouseDown={(e) => {
									e.preventDefault()
									selectMedication(m)
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

interface RestockFormProps {
	medications: Medication[]
	mode?: 'create' | 'edit'
	restockId?: string
	defaultValues?: {
		date: string
		items: Array<{ medicationId: string; quantity: number; costPerUnit: number; expiryDate?: string }>
	}
}

export function RestockForm({ medications, mode = 'create', restockId, defaultValues }: RestockFormProps) {
	const router = useRouter()
	const [error, setError] = useState('')
	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema) as any,
		defaultValues: defaultValues || {
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
			items: data.items.map((item) => ({
				...item,
				expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
			})),
		}
		const url = mode === 'edit' && restockId ? `/api/restock/${restockId}` : '/api/restock'
		const method = mode === 'edit' ? 'PATCH' : 'POST'
		const res = await fetch(url, {
			method,
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
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-6 max-w-2xl'>
			<div className='space-y-1'>
				<Label>Restock Date</Label>
				<DateTimePicker value={dateValue ? new Date(dateValue) : undefined} onChange={(date) => setValue('date', date ? date.toISOString() : '')} />
			</div>
			<div className='space-y-4'>
				{fields.map((field, i) => (
					<div key={field.id} className='border rounded p-4 space-y-3'>
						<div className='flex items-center justify-between'>
							<span className='text-sm font-medium'>Item {i + 1}</span>
							{fields.length > 1 && (
								<Button type='button' variant='ghost' size='sm' onClick={() => remove(i)}>
									Remove
								</Button>
							)}
						</div>
						<div className='space-y-3'>
							<div className='space-y-1'>
								<Label>Medication</Label>
								<MedicationSelector medications={medications} value={itemsValue[i]?.medicationId} onChange={(medicationId) => setValue(`items.${i}.medicationId`, medicationId)} />
							</div>
							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-1'>
									<Label>Quantity</Label>
									<Input type='number' {...register(`items.${i}.quantity`)} />
								</div>
								<div className='space-y-1'>
									<Label>Cost per Unit</Label>
									<Input type='number' step='0.01' {...register(`items.${i}.costPerUnit`)} />
								</div>
							</div>
							<div className='space-y-1'>
								<Label>Expiry Date</Label>
								<DatePicker
									value={itemsValue[i]?.expiryDate ? new Date(itemsValue[i]?.expiryDate as string) : undefined}
									onChange={(date) => setValue(`items.${i}.expiryDate`, date ? date.toISOString() : '')}
									placeholder='No expiry'
								/>
							</div>
						</div>
					</div>
				))}
				<Button type='button' variant='outline' onClick={() => append({ medicationId: '', quantity: 1, costPerUnit: 0, expiryDate: '' })}>
					+ Add Item
				</Button>
			</div>
			{error && <p className='text-sm text-red-500'>{error}</p>}
			<Button type='submit' disabled={isSubmitting}>
				{mode === 'edit' ? 'Update Restock' : 'Save Restock'}
			</Button>
		</form>
	)
}
