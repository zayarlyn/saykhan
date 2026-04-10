import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createExpenseSchema } from '@/lib/validations/expense'

export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  const expense = await prisma.expense.create({
    data: {
      type: 'MANUAL',
      amount: parsed.data.amount,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      categoryId: parsed.data.categoryId ?? null,
    },
    include: { category: true },
  })
  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return NextResponse.json(expense, { status: 201 })
}
