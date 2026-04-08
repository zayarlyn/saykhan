import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateSessionSchema } from '@/lib/validations/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await prisma.patientSession.findUnique({
    where: { id },
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
    where: { id },
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
    await tx.patientSession.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const existing = await prisma.patientSession.findUnique({
    where: { id },
    include: { medications: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { medications: newMeds, ...sessionFields } = parsed.data

  let updated
  try {
    updated = await prisma.$transaction(async tx => {
      // Restore stock for old medications
      await Promise.all(
        existing.medications.map(m =>
          tx.medication.update({
            where: { id: m.medicationId },
            data: { stock: { increment: m.quantity } },
          })
        )
      )
      // Delete old session medications
      await tx.sessionMedication.deleteMany({ where: { sessionId: id } })

      // Check sufficient stock for new medications (after old stock has been restored)
      for (const med of newMeds) {
        const medication = await tx.medication.findUnique({ where: { id: med.medicationId } })
        if (!medication || medication.stock < med.quantity) {
          throw new Error(`Insufficient stock for ${med.medicationId}`)
        }
      }

      // Create new session medications and deduct stock
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
        ...newMeds.map(m =>
          tx.medication.update({
            where: { id: m.medicationId },
            data: { stock: { decrement: m.quantity } },
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

  return NextResponse.json(updated)
}
