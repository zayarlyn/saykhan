import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updatePatientSchema } from '@/lib/validations/patient'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      sessions: {
        include: { serviceType: true, paymentMethod: true, medications: { include: { medication: true } } },
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(patient)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  const patient = await prisma.patient.update({ where: { id }, data: parsed.data })
  return NextResponse.json(patient)
}
