import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveRange } from '@/lib/date-range'
import { buttonVariants } from '@/components/ui/button'
import { ExpenseTable } from '@/components/expenses/expense-table'
import { DateRangeSelector } from '@/components/dashboard/date-range-selector'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
  const { preset, from, to } = await searchParams
  const { start, end, activePreset } = resolveRange(preset, from, to)

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    include: { category: true },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link href="/expenses/new" className={buttonVariants()}>Add Expense</Link>
      </div>
      <DateRangeSelector activePreset={activePreset} from={activePreset === 'custom' ? from : undefined} to={activePreset === 'custom' ? to : undefined} basePath="/expenses" />
      <ExpenseTable expenses={expenses.map(e => ({ ...e, amount: Number(e.amount), date: e.date.toISOString() }))} />
    </div>
  )
}
