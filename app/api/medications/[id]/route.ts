import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { updateMedicationSchema } from '@/lib/validations/medication'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const med = await prisma.medication.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: true,
      restockItems: {
        include: { restockBatch: { select: { date: true } } },
        orderBy: { restockBatch: { date: 'desc' } },
      },
    },
  })
  if (!med) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(med)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const parsed = updateMedicationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const med = await prisma.medication.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  })
  revalidatePath('/inventory')
  revalidatePath('/inventory/restock')
  revalidatePath('/sessions/new')
  return NextResponse.json(med)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.medication.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
  revalidatePath('/inventory')
  revalidatePath('/inventory/restock')
  revalidatePath('/sessions/new')
  return NextResponse.json({ ok: true })
}
