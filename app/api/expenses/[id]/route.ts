import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type === 'RESTOCK') return NextResponse.json({ error: 'Cannot edit restock expenses' }, { status: 403 })

  const body = await req.json()
  const parsed = updateExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const updated = await prisma.expense.update({
    where: { id },
    data: { ...parsed.data, date: parsed.data.date ? new Date(parsed.data.date) : undefined },
    include: { category: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.type === 'RESTOCK') return NextResponse.json({ error: 'Cannot delete restock expenses' }, { status: 403 })

  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
