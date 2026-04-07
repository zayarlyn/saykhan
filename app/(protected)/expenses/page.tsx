import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ExpenseTable } from '@/components/expenses/expense-table'

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Button asChild><Link href="/expenses/new">Add Expense</Link></Button>
      </div>
      <ExpenseTable expenses={expenses.map(e => ({ ...e, amount: Number(e.amount) }))} />
    </div>
  )
}
