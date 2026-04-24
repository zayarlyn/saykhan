import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/session-form'
import type { SessionFormData } from '@/lib/validations/session'
import { buttonVariants } from '@/components/ui/button'
import { BackButton } from '@/components/layout/back-button'
export const dynamic = 'force-dynamic'

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [session, serviceTypes, paymentMethods, medications, patients] = await Promise.all([
    prisma.patientSession.findUnique({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        medications: { include: { medication: true } },
      },
    }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.medication.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
    prisma.patient.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!session) notFound()

  // Include deleted medications referenced by this session so they still display in the form
  const activeMedIds = new Set(medications.map(m => m.id))
  const deletedMedsInSession = session.medications
    .filter(m => m.medication.deletedAt !== null && !activeMedIds.has(m.medication.id))
    .map(m => ({
      id: m.medication.id,
      name: m.medication.name,
      cost: Number(m.medication.cost),
      sellingPrice: Number(m.medication.sellingPrice),
      deletedAt: m.medication.deletedAt!.toISOString(),
    }))
  const allMedications = [
    ...medications.map(m => ({ id: m.id, name: m.name, cost: Number(m.cost), sellingPrice: Number(m.sellingPrice), deletedAt: null as string | null })),
    ...deletedMedsInSession,
  ]

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

  async function handleSubmit(data: SessionFormData): Promise<{ error: string } | void> {
    'use server'
    const existing = await prisma.patientSession.findUnique({
      where: { id, deletedAt: null },
      include: { medications: true },
    })
    if (!existing) return { error: 'Session not found' }

    const { medications: newMeds, patientId, serviceTypeId, paymentMethodId, date, description, paymentAmount } = data

    try {
      await prisma.$transaction(async tx => {
        const oldQtyMap = new Map<string, number>()
        for (const m of existing.medications) {
          oldQtyMap.set(m.medicationId, (oldQtyMap.get(m.medicationId) ?? 0) + m.quantity)
        }
        const newQtyMap = new Map<string, number>()
        for (const m of newMeds) {
          newQtyMap.set(m.medicationId, (newQtyMap.get(m.medicationId) ?? 0) + m.quantity)
        }
        const allMedIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()])
        const netChanges = [...allMedIds].map(medId => ({
          medId,
          net: (newQtyMap.get(medId) ?? 0) - (oldQtyMap.get(medId) ?? 0),
        }))

        for (const { medId, net } of netChanges) {
          if (net > 0) {
            const medication = await tx.medication.findUnique({ where: { id: medId } })
            if (!medication || medication.stock < net) throw new Error(`Insufficient stock for ${medication?.name ?? medId}`)
          }
        }

        await tx.sessionMedication.deleteMany({ where: { sessionId: id } })
        await Promise.all([
          tx.sessionMedication.createMany({
            data: newMeds.map(m => ({ sessionId: id, medicationId: m.medicationId, quantity: m.quantity, unitCost: m.unitCost, sellingPrice: m.sellingPrice })),
          }),
          ...netChanges
            .filter(({ net }) => net !== 0)
            .map(({ medId, net }) =>
              tx.medication.update({ where: { id: medId }, data: { stock: net > 0 ? { decrement: net } : { increment: -net } } })
            ),
        ])

        await tx.patientSession.update({
          where: { id },
          data: { patientId: patientId ?? null, serviceTypeId, paymentMethodId, date: new Date(date), description: description ?? null, paymentAmount },
        })
      })
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Failed to update session' }
    }

    revalidatePath('/sessions')
    revalidatePath('/dashboard')
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
        patients={patients.map(p => ({ id: p.id, name: p.name }))}
        serviceTypes={serviceTypes.map(s => ({ id: s.id, name: s.name }))}
        paymentMethods={paymentMethods.map(p => ({ id: p.id, name: p.name }))}
        medications={allMedications}
        defaultValues={defaultValues}
        onSubmitOverride={handleSubmit}
      />
    </div>
  )
}
