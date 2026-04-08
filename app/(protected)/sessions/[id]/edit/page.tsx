import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/session-form'
import type { SessionFormData } from '@/lib/validations/session'
import { buttonVariants } from '@/components/ui/button'
import { BackButton } from '@/components/layout/back-button'

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [session, serviceTypes, paymentMethods, medications, patients] = await Promise.all([
    prisma.patientSession.findUnique({
      where: { id },
      include: {
        patient: true,
        medications: { include: { medication: true } },
      },
    }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.medication.findMany({ orderBy: { name: 'asc' } }),
    prisma.patient.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!session) notFound()

  const defaultValues = {
    patientId: session.patientId ?? null,
    patientName: session.patient?.name ?? '',
    serviceTypeId: session.serviceTypeId,
    paymentMethodId: session.paymentMethodId,
    date: new Date(session.date).toISOString(),
    description: session.description ?? undefined,
    paymentAmount: Number(session.paymentAmount),
    medications: session.medications.map(m => ({
      medicationId: m.medicationId,
      quantity: m.quantity,
      unitCost: Number(m.unitCost),
      sellingPrice: Number(m.sellingPrice),
    })),
  }

  async function handleSubmit(data: SessionFormData) {
    'use server'
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/sessions/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          ...data,
          date: new Date(data.date).toISOString(),
        }),
      }
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Failed to update session')
    }
    redirect(`/sessions/${id}`)
  }

  return (
    <div className="space-y-4">
      <BackButton label="Session" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Session</h1>
        <Link href={`/sessions/${id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Cancel
        </Link>
      </div>
      <SessionForm
        patients={patients}
        serviceTypes={serviceTypes}
        paymentMethods={paymentMethods}
        medications={medications.map(m => ({
          id: m.id,
          name: m.name,
          cost: Number(m.cost),
          sellingPrice: Number(m.sellingPrice),
        }))}
        defaultValues={defaultValues}
        onSubmitOverride={handleSubmit}
      />
    </div>
  )
}
