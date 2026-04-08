import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createMedicationSchema } from '@/lib/validations/medication'

export async function GET() {
  const medications = await prisma.medication.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  const withExpiry = await Promise.all(
    medications.map(async med => {
      const nearestBatch = await prisma.restockBatchItem.findFirst({
        where: { medicationId: med.id, expiryDate: { gte: new Date() } },
        orderBy: { expiryDate: 'asc' },
      })
      return { ...med, nearestExpiry: nearestBatch?.expiryDate ?? null }
    })
  )

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
