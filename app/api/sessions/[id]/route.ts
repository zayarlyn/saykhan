import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
