import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPatientSchema } from '@/lib/validations/patient'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('q') ?? ''
  const patients = await prisma.patient.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
    orderBy: { name: 'asc' },
    include: { _count: { select: { sessions: true } } },
  })
  return NextResponse.json(patients)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createPatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  const patient = await prisma.patient.create({ data: { name: parsed.data.name } })
  return NextResponse.json(patient, { status: 201 })
}
