import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateSessionSchema } from '@/lib/validations/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await prisma.patientSession.findUnique({
    where: { id, deletedAt: null },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await prisma.patientSession.findUnique({
    where: { id, deletedAt: null },
    include: { medications: true },
  })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async tx => {
    await Promise.all(
      session.medications.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { increment: m.quantity } },
        })
      )
    )
    await tx.patientSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  })

  revalidatePath('/sessions')
  revalidatePath('/dashboard')
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const existing = await prisma.patientSession.findUnique({
    where: { id, deletedAt: null },
    include: { medications: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { medications: newMeds, ...sessionFields } = parsed.data

  let updated
  try {
    updated = await prisma.$transaction(async tx => {
      // Compute net stock change per medication (new total - old total)
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

      // Only check stock for medications where we need MORE than before
      for (const { medId, net } of netChanges) {
        if (net > 0) {
          const medication = await tx.medication.findUnique({ where: { id: medId } })
          if (!medication || medication.stock < net) {
            throw new Error(`Insufficient stock for ${medId}`)
          }
        }
      }

      // Delete old session medications
      await tx.sessionMedication.deleteMany({ where: { sessionId: id } })

      // Create new session medications and apply net stock changes
      await Promise.all([
        tx.sessionMedication.createMany({
          data: newMeds.map(m => ({
            sessionId: id,
            medicationId: m.medicationId,
            quantity: m.quantity,
            unitCost: m.unitCost,
            sellingPrice: m.sellingPrice,
          })),
        }),
        ...netChanges
          .filter(({ net }) => net !== 0)
          .map(({ medId, net }) =>
            tx.medication.update({
              where: { id: medId },
              data: { stock: net > 0 ? { decrement: net } : { increment: -net } },
            })
          ),
      ])

      return tx.patientSession.update({
        where: { id },
        data: {
          patientId: sessionFields.patientId,
          serviceTypeId: sessionFields.serviceTypeId,
          paymentMethodId: sessionFields.paymentMethodId,
          date: new Date(sessionFields.date),
          description: sessionFields.description ?? null,
          paymentAmount: sessionFields.paymentAmount,
        },
        include: {
          patient: true,
          serviceType: true,
          paymentMethod: true,
          medications: { include: { medication: true } },
        },
      })
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith('Insufficient stock')) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    throw e
  }

  revalidatePath('/sessions')
  revalidatePath('/dashboard')
  return NextResponse.json(updated)
}
