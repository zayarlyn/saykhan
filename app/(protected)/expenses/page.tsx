import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolveRange } from '@/lib/date-range'
import { buttonVariants } from '@/components/ui/button'
import { ExpenseTableWrapper } from '@/components/expenses/expense-table-wrapper'
import { DateRangeSelector } from '@/components/dashboard/date-range-selector'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; page?: string }>
}) {
  const { preset, from, to, page } = await searchParams
  const { start, end, activePreset } = resolveRange(preset, from, to)
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const skip = (pageNum - 1) * PAGE_SIZE

  const [expenses, expensesTotal] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.expense.count({
      where: { date: { gte: start, lte: end } },
    }),
  ])

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalPages = Math.ceil(expensesTotal / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link href="/expenses/new" className={buttonVariants()}>Add Expense</Link>
      </div>
      <DateRangeSelector activePreset={activePreset} from={activePreset === 'custom' ? from : undefined} to={activePreset === 'custom' ? to : undefined} basePath="/expenses" />
      {expenses.length > 0 && (
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{totalAmount.toLocaleString()} MMK</span>
        </div>
      )}
      <ExpenseTableWrapper expenses={expenses.map(e => ({ ...e, amount: Number(e.amount), date: e.date.toISOString() }))} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            Page {pageNum} of {totalPages}
          </div>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={`/expenses?${new URLSearchParams({ preset, page: String(pageNum - 1) }).toString()}`} className={buttonVariants({ variant: 'outline' })}>
                Previous
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/expenses?${new URLSearchParams({ preset, page: String(pageNum + 1) }).toString()}`} className={buttonVariants({ variant: 'outline' })}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
