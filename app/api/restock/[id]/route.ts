import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateRestockSchema } from '@/lib/validations/restock'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        where: { medication: { deletedAt: null } },
        include: { medication: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expense: { select: { amount: true } },
    },
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(batch)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.$transaction(async tx => {
    // Reverse stock increments from all items
    await Promise.all(
      batch.items.map(item =>
        tx.medication.update({
          where: { id: item.medicationId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    )
    // Delete items and expense
    await tx.restockBatchItem.deleteMany({ where: { restockBatchId: id } })
    await tx.expense.deleteMany({ where: { restockBatchId: id } })
    // Delete batch
    await tx.restockBatch.delete({ where: { id } })
  })

  revalidatePath('/inventory')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateRestockSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const { date, items: newItems } = parsed.data
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: { items: true, expense: true },
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.$transaction(async tx => {
    // Reverse old stock increments
    await Promise.all(
      batch.items.map(item =>
        tx.medication.update({
          where: { id: item.medicationId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    )

    // Delete old items
    await tx.restockBatchItem.deleteMany({ where: { restockBatchId: id } })

    // Create new items and apply stock increments
    const newTotal = newItems.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)

    const updatedBatch = await tx.restockBatch.update({
      where: { id },
      data: {
        date: new Date(date),
        items: {
          create: newItems.map(item => ({
            medicationId: item.medicationId,
            quantity: item.quantity,
            costPerUnit: item.costPerUnit,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: {
        items: { include: { medication: { select: { name: true } } } },
        expense: { select: { amount: true } },
      },
    })

    // Apply new stock increments and update cost for each medication
    await Promise.all(
      newItems.map(item =>
        tx.medication.update({
          where: { id: item.medicationId },
          data: { stock: { increment: item.quantity }, cost: item.costPerUnit },
        })
      )
    )

    // Update linked expense
    if (batch.expense) {
      await tx.expense.update({
        where: { id: batch.expense.id },
        data: { amount: newTotal, date: new Date(date) },
      })
    }

    return updatedBatch
  })

  revalidatePath('/inventory')
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return NextResponse.json(updated)
}
