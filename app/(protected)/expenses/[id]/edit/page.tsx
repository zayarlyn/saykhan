import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ExpenseForm } from '@/components/expenses/expense-form'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!expense) notFound()
  if (expense.type === 'RESTOCK') notFound()

  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' },
  })

  const defaultValues = {
    categoryId: expense.categoryId ?? undefined,
    amount: Number(expense.amount),
    description: expense.description ?? undefined,
    date: expense.date.toISOString(),
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Edit Expense</h1>
        <p className="text-sm text-gray-600">Update the expense details.</p>
      </div>
      <ExpenseForm
        categories={categories}
        mode="edit"
        expenseId={id}
        defaultValues={defaultValues}
      />
    </div>
  )
}
