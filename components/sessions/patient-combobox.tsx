'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Patient {
	id: string
	name: string
}

interface PatientComboboxProps {
	patients: Patient[]
	onSelect: (patientId: string, newPatientName?: string) => void
	defaultPatient?: { id: string; name: string }
}

export function PatientCombobox({ patients, onSelect, defaultPatient }: PatientComboboxProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState(defaultPatient?.name ?? '')
	const [selected, setSelected] = useState<{ label: string; isNew: boolean } | null>(defaultPatient ? { label: defaultPatient.name, isNew: false } : null)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	// Close on outside click
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
	const filtered = patients.filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()))
	const exactMatch = patients.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
	const showCreate = trimmed.length > 0 && !exactMatch

	function selectPatient(patient: Patient) {
		setSelected({ label: patient.name, isNew: false })
		setQuery(patient.name)
		setOpen(false)
		onSelect(patient.id)
	}

	function createPatient() {
		setSelected({ label: trimmed, isNew: true })
		setQuery(trimmed)
		setOpen(false)
		onSelect('', trimmed)
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
				{selected?.isNew && <UserPlus className='size-3.5 shrink-0 text-[#2e37a4]' />}
				<input
					ref={inputRef}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value)
						setOpen(true)
						setSelected(null)
					}}
					onFocus={() => setOpen(true)}
					placeholder='Search or create patient…'
					className='flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-0'
				/>
				<ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
			</div>

			{open && (
				<div className='absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden'>
					<ul className='max-h-52 overflow-y-auto py-1'>
						{filtered.length === 0 && !showCreate && <li className='px-3 py-2 text-sm text-muted-foreground'>No patients found</li>}
						{filtered.map((p) => (
							<li
								key={p.id}
								onMouseDown={(e) => {
									e.preventDefault()
									selectPatient(p)
								}}
								className='flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground'
							>
								<Check className={cn('size-3.5 shrink-0', selected?.label === p.name && !selected.isNew ? 'inline' : 'hidden')} />
								{p.name}
							</li>
						))}
						{showCreate && (
							<li
								onMouseDown={(e) => {
									e.preventDefault()
									createPatient()
								}}
								className='flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-t border-border text-[#2e37a4] font-medium'
							>
								<UserPlus className='size-3.5 shrink-0' />
								Create &ldquo;{trimmed}&rdquo;
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	)
}
