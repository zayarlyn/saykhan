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
import { MedicationSelector } from './medication-selector'

const schema = z.object({
  patientId: z.string().min(1, 'Patient required'),
  newPatientName: z.string().optional(),
  serviceTypeId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional(),
  paymentAmount: z.coerce.number().nonnegative(),
  medications: z.array(z.object({
    medicationId: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().nonnegative(),
    sellingPrice: z.coerce.number().nonnegative(),
  })),
})

type FormData = z.infer<typeof schema>

interface Patient { id: string; name: string }
interface ServiceType { id: string; name: string }
interface PaymentMethod { id: string; name: string }
interface Medication { id: string; name: string; cost: number; sellingPrice: number }

interface Props {
  patients: Patient[]
  serviceTypes: ServiceType[]
  paymentMethods: PaymentMethod[]
  medications: Medication[]
}

export function SessionForm({ patients, serviceTypes, paymentMethods, medications }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isNewPatient, setIsNewPatient] = useState(false)

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      date: new Date().toISOString().slice(0, 16),
      medications: [],
    },
  })

  async function onSubmit(data: FormData) {
    setError('')
    let patientId = data.patientId

    if (isNewPatient && data.newPatientName) {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.newPatientName }),
      })
      if (!res.ok) { setError('Failed to create patient'); return }
      const patient = await res.json()
      patientId = patient.id
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      <div className="space-y-1">
        <Label>Patient</Label>
        <div className="flex gap-2">
          {!isNewPatient ? (
            <Select onValueChange={v => setValue('patientId', v)}>
              <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
              <SelectContent>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="New patient name" {...register('newPatientName')} />
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => { setIsNewPatient(v => !v); setValue('patientId', '') }}>
            {isNewPatient ? 'Existing' : '+ New'}
          </Button>
        </div>
        {errors.patientId && <p className="text-xs text-red-500">{errors.patientId.message}</p>}
      </div>

      <div className="space-y-1">
        <Label>Service Type</Label>
        <Select onValueChange={v => setValue('serviceTypeId', v)}>
          <SelectTrigger><SelectValue placeholder="Select service…" /></SelectTrigger>
          <SelectContent>
            {serviceTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.serviceTypeId && <p className="text-xs text-red-500">Required</p>}
      </div>

      <div className="space-y-1">
        <Label>Date & Time</Label>
        <Input type="datetime-local" {...register('date')} />
      </div>

      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea {...register('description')} rows={2} />
      </div>

      <MedicationSelector control={control} medications={medications} setValue={setValue} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Amount (MMK)</Label>
          <Input type="number" {...register('paymentAmount')} />
        </div>
        <div className="space-y-1">
          <Label>Payment Method</Label>
          <Select onValueChange={v => setValue('paymentMethodId', v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>Save Session</Button>
    </form>
  )
}
