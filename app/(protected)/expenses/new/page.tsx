import { prisma } from '@/lib/prisma'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { BackButton } from '@/components/layout/back-button'
export const dynamic = 'force-dynamic'

export default async function NewExpensePage() {
  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="space-y-4">
      <BackButton label="Expenses" />
      <h1 className="text-2xl font-bold">Add Expense</h1>
      <ExpenseForm categories={categories} />
    </div>
  )
}
