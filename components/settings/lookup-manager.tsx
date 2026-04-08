'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const schema = z.object({ name: z.string().min(1) })

interface Item {
	id: string
	name: string
}

interface Props {
	label: string
	entity: string
	initial: Item[]
}

export function LookupManager({ label, entity, initial }: Props) {
	const [items, setItems] = useState<Item[]>(initial)
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({
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
			setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
			reset()
		}
	}

	async function onDelete(id: string) {
		await fetch(`/api/settings/${entity}`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id }),
		})
		setItems((prev) => prev.filter((i) => i.id !== id))
	}

	return (
		<div className='space-y-3'>
			<h3 className='font-medium text-sm'>{label}</h3>
			<form onSubmit={handleSubmit(onAdd)} className='flex gap-2'>
				<Input placeholder={`Add ${label.toLowerCase()}…`} {...register('name')} />
				<Button type='submit'>Add</Button>
			</form>
			{errors.name && <p className='text-xs text-red-500'>Required</p>}
			<div className='flex flex-wrap gap-2'>
				{items.map((item) => (
					<Badge key={item.id} variant='secondary' className='gap-1'>
						{item.name}
						<button onClick={() => onDelete(item.id)} className='text-xs hover:text-red-600'>
							×
						</button>
					</Badge>
				))}
			</div>
		</div>
	)
}
