import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRestockSchema } from '@/lib/validations/restock'

export async function GET() {
  const batches = await prisma.restockBatch.findMany({
    include: {
      _count: { select: { items: true } },
      expense: { select: { amount: true } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(batches)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createRestockSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { date, items } = parsed.data
  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)

  const batch = await prisma.$transaction(async tx => {
    const restockBatch = await tx.restockBatch.create({
      data: {
        date: new Date(date),
        items: {
          create: items.map(item => ({
            medicationId: item.medicationId,
            quantity: item.quantity,
            costPerUnit: item.costPerUnit,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: { items: true },
    })

    await Promise.all(
      items.map(item =>
        tx.medication.update({
          where: { id: item.medicationId },
          data: { stock: { increment: item.quantity }, cost: item.costPerUnit },
        })
      )
    )

    await tx.expense.create({
      data: {
        type: 'RESTOCK',
        amount: totalCost,
        description: `Restock batch — ${items.length} item(s)`,
        date: new Date(date),
        restockBatchId: restockBatch.id,
      },
    })

    return restockBatch
  })

  return NextResponse.json(batch, { status: 201 })
}
