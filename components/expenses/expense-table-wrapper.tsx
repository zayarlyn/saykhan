'use client'

import { useRouter } from 'next/navigation'
import { ExpenseTable } from '@/components/expenses/expense-table'

interface Expense {
  id: string
  type: 'RESTOCK' | 'MANUAL'
  category: { name: string } | null
  amount: number
  description: string | null
  date: string
  restockBatchId: string | null
}

export function ExpenseTableWrapper({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()

  return (
    <ExpenseTable
      expenses={expenses}
      onRowClick={(expenseId) => router.push(`/expenses/${expenseId}`)}
    />
  )
}
