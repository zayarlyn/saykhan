'use client'

import { useState } from 'react'
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
import { MedicationSelector } from './medication-selector'
import { PatientCombobox } from './patient-combobox'

const schema = z.object({
	patientId: z.string().min(1, 'Patient required'),
	newPatientName: z.string().optional(),
	serviceTypeId: z.string().min(1),
	paymentMethodId: z.string().min(1),
	date: z.string().min(1),
	description: z.string().optional(),
	paymentAmount: z.coerce.number().nonnegative(),
	medications: z.array(
		z.object({
			medicationId: z.string().min(1),
			quantity: z.coerce.number().int().positive(),
			unitCost: z.coerce.number().nonnegative(),
			sellingPrice: z.coerce.number().nonnegative(),
		})
	),
})

type FormData = z.infer<typeof schema>

interface Patient {
	id: string
	name: string
}
interface ServiceType {
	id: string
	name: string
}
interface PaymentMethod {
	id: string
	name: string
}
interface Medication {
	id: string
	name: string
	cost: number
	sellingPrice: number
}

interface Props {
	patients: Patient[]
	serviceTypes: ServiceType[]
	paymentMethods: PaymentMethod[]
	medications: Medication[]
	defaultValues?: {
		patientId: string
		patientName: string
		serviceTypeId: string
		paymentMethodId: string
		date: string
		description?: string
		paymentAmount: number
		medications: Array<{ medicationId: string; quantity: number; unitCost: number; sellingPrice: number }>
	}
	onSubmitOverride?: (data: FormData) => Promise<void>
}

export function SessionForm({ patients, serviceTypes, paymentMethods, medications, defaultValues, onSubmitOverride }: Props) {
	const router = useRouter()
	const [error, setError] = useState('')
	const [isNewPatient, setIsNewPatient] = useState(false)
	// isNewPatient is set via PatientCombobox — true when user types a new name

	const {
		register,
		handleSubmit,
		control,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema) as any,
		defaultValues: {
			date: new Date().toISOString(),
			medications: [],
			...defaultValues,
		},
	})

	const dateValue = watch('date')

	async function onSubmit(data: FormData) {
		setError('')

		if (onSubmitOverride) {
			try {
				await onSubmitOverride(data)
			} catch (e: any) {
				setError(e?.message ?? 'Failed to save session')
			}
			return
		}

		let patientId = data.patientId

		if (isNewPatient && data.newPatientName) {
			const res = await fetch('/api/patients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: data.newPatientName }),
			})
			if (!res.ok) {
				setError('Failed to create patient')
				return
			}
			const patient = await res.json()
			patientId = patient.id
		} else if (!patientId || patientId === 'new') {
			setError('Please select or create a patient')
			return
		}

		const body = {
			patientId,
			serviceTypeId: data.serviceTypeId,
			paymentMethodId: data.paymentMethodId,
			date: new Date(data.date).toISOString(),
			description: data.description,
			paymentAmount: data.paymentAmount,
			medications: data.medications,
		}

		const res = await fetch('/api/sessions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})

		if (res.ok) {
			router.push('/sessions')
		} else {
			const err = await res.json()
			setError(err.error ?? 'Failed to save session')
		}
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className='space-y-5 max-w-xl w-full'>
			<div className='space-y-1'>
				<Label>Patient</Label>
				<PatientCombobox
					patients={patients}
					defaultPatient={defaultValues ? { id: defaultValues.patientId, name: defaultValues.patientName } : undefined}
					onSelect={(patientId, newPatientName) => {
						if (newPatientName) {
							setIsNewPatient(true)
							setValue('newPatientName', newPatientName)
							setValue('patientId', 'new')
						} else {
							setIsNewPatient(false)
							setValue('newPatientName', undefined)
							setValue('patientId', patientId)
						}
					}}
				/>
				{errors.patientId && <p className='text-xs text-red-500'>{errors.patientId.message}</p>}
			</div>

			<div className='space-y-1'>
				<Label>Service Type</Label>
				<Select defaultValue={defaultValues?.serviceTypeId} onValueChange={(v: string | null) => setValue('serviceTypeId', v ?? '')}>
					<SelectTrigger>
						<SelectValue placeholder='Select service…' />
					</SelectTrigger>
					<SelectContent>
						{serviceTypes.map((s) => (
							<SelectItem key={s.id} value={s.id}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.serviceTypeId && <p className='text-xs text-red-500'>Required</p>}
			</div>

			<div className='space-y-1'>
				<Label>Date & Time</Label>
				<DateTimePicker
					value={dateValue ? new Date(dateValue) : undefined}
					onChange={(date) => setValue('date', date ? date.toISOString() : '')}
				/>
			</div>

			<div className='space-y-1'>
				<Label>Description</Label>
				<Textarea {...register('description')} rows={2} />
			</div>

			<MedicationSelector control={control as any} medications={medications} setValue={setValue} />

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1'>
					<Label>Amount (MMK)</Label>
					<Input type='number' {...register('paymentAmount')} />
				</div>
				<div className='space-y-1'>
					<Label>Payment Method</Label>
					<Select defaultValue={defaultValues?.paymentMethodId} onValueChange={(v: string | null) => setValue('paymentMethodId', v ?? '')}>
						<SelectTrigger>
							<SelectValue placeholder='Select…' />
						</SelectTrigger>
						<SelectContent>
							{paymentMethods.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{error && <p className='text-sm text-red-500'>{error}</p>}
			<Button type='submit' disabled={isSubmitting}>
				Save Session
			</Button>
		</form>
	)
}
