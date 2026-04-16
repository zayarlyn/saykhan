import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createSessionSchema } from '@/lib/validations/session'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const patientId = params.get('patientId')
  const serviceTypeId = params.get('serviceTypeId')
  const from = params.get('from')
  const to = params.get('to')

  const sessions = await prisma.patientSession.findMany({
    where: {
      deletedAt: null,
      ...(patientId && { patientId }),
      ...(serviceTypeId && { serviceTypeId }),
      ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { medications, ...sessionData } = parsed.data

  // Check stock for all medications before transacting
  const medIds = medications.map(m => m.medicationId)
  const foundMeds = await prisma.medication.findMany({ where: { id: { in: medIds }, deletedAt: null } })
  const medMap = new Map(foundMeds.map(m => [m.id, m]))

  for (const med of medications) {
    const medication = medMap.get(med.medicationId)
    if (!medication) return NextResponse.json({ error: `Medication ${med.medicationId} not found` }, { status: 404 })
    if (medication.stock < med.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${medication.name}: have ${medication.stock}, need ${med.quantity}` },
        { status: 422 }
      )
    }
  }

  const session = await prisma.$transaction(async tx => {
    const created = await tx.patientSession.create({
      data: {
        patientId: sessionData.patientId,
        serviceTypeId: sessionData.serviceTypeId,
        paymentMethodId: sessionData.paymentMethodId,
        date: new Date(sessionData.date),
        description: sessionData.description,
        paymentAmount: sessionData.paymentAmount,
        medications: {
          create: medications.map(m => ({
            medicationId: m.medicationId,
            quantity: m.quantity,
            unitCost: m.unitCost,
            sellingPrice: m.sellingPrice,
          })),
        },
      },
      include: {
        patient: true,
        serviceType: true,
        paymentMethod: true,
        medications: { include: { medication: true } },
      },
    })

    await Promise.all(
      medications.map(m =>
        tx.medication.update({
          where: { id: m.medicationId },
          data: { stock: { decrement: m.quantity } },
        })
      )
    )

    return created
  })

  revalidatePath('/sessions')
  revalidatePath('/dashboard')
  return NextResponse.json(session, { status: 201 })
}
