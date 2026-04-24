import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/layout/back-button'
import { ExpenseDeleteButton } from '@/components/expenses/expense-delete-button'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExpenseDetailPage({
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

  const isManual = expense.type === 'MANUAL'

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton label="Expenses" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expense</h1>
          <p className="text-sm text-gray-500 mt-0.5">{new Date(expense.date).toLocaleDateString()}</p>
        </div>
        {isManual && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/expenses/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            </Link>
            <ExpenseDeleteButton expenseId={id} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded border bg-white p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-lg font-semibold">{Number(expense.amount).toLocaleString()} MMK</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="text-sm">{expense.category?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="text-sm">{expense.type}</p>
            </div>
            {expense.description && (
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-sm">{expense.description}</p>
              </div>
            )}
          </div>
        </div>

        {!isManual && (
          <div className="rounded border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              This is a RESTOCK expense and is automatically managed. It is tied to a restock batch and cannot be edited or deleted directly.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
