'use client'

import { useState, useRef, useEffect } from 'react'
import { useFieldArray, Control, UseFormSetValue } from 'react-hook-form'
import type { SessionFormData } from '@/lib/validations/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Medication { id: string; name: string; cost: number; sellingPrice: number; deletedAt?: string | null }

function MedicationDropdown({ medications, value, onChange }: { medications: Medication[]; value?: string; onChange: (id: string) => void }) {
	const selected = value ? medications.find(m => m.id === value) : null
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState(selected?.name ?? '')
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

	useEffect(() => {
		setQuery(selected?.name ?? '')
	}, [value])

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
				{selected?.deletedAt && <span className='text-xs text-red-500 shrink-0'>(deleted)</span>}
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
								{m.deletedAt && <span className='ml-1 text-xs text-red-500'>(deleted)</span>}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}

export function MedicationSelector({ control, medications, setValue }: {
  control: Control<SessionFormData>
  medications: Medication[]
  setValue: UseFormSetValue<SessionFormData>
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medications' })

  function handleMedChange(index: number, medId: string) {
    setValue(`medications.${index}.medicationId`, medId)
    const med = medications.find(m => m.id === medId)
    if (med) {
      setValue(`medications.${index}.unitCost`, med.cost)
      setValue(`medications.${index}.sellingPrice`, med.sellingPrice)
    }
  }

  return (
    <div className="space-y-3">
      <Label>Medications Used</Label>
      {fields.map((field, i) => (
        <div key={field.id} className="flex items-center gap-2">
          <MedicationDropdown
            medications={medications}
            value={field.medicationId}
            onChange={medId => handleMedChange(i, medId)}
          />
          <Input type="number" placeholder="Qty" className="w-20" {...control.register(`medications.${i}.quantity`, { valueAsNumber: true })} />
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs shrink-0" onClick={() => remove(i)}>✕</Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm"
        onClick={() => append({ medicationId: '', quantity: 1, unitCost: 0, sellingPrice: 0 })}>
        + Add Medication
      </Button>
    </div>
  )
}
