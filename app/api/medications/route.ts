import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMedicationSchema } from '@/lib/validations/medication'

export async function GET() {
  const medications = await prisma.medication.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  const expiryGroups = await prisma.restockBatchItem.groupBy({
    by: ['medicationId'],
    where: { medicationId: { in: medications.map(m => m.id) }, expiryDate: { gte: new Date() } },
    _min: { expiryDate: true },
  })
  const expiryMap = Object.fromEntries(expiryGroups.map(g => [g.medicationId, g._min.expiryDate]))
  const withExpiry = medications.map(med => ({ ...med, nearestExpiry: expiryMap[med.id] ?? null }))

  return NextResponse.json(withExpiry)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createMedicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const med = await prisma.medication.create({
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      unitType: parsed.data.unitType,
      cost: parsed.data.cost,
      sellingPrice: parsed.data.sellingPrice,
      threshold: parsed.data.threshold,
    },
    include: { category: true },
  })
  return NextResponse.json(med, { status: 201 })
}
