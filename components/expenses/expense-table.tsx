'use client'

import { Badge } from '@/components/ui/badge'

interface Expense {
  id: string
  type: 'RESTOCK' | 'MANUAL'
  category: { name: string } | null
  amount: number
  description: string | null
  date: string
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  return (
    <div className="rounded border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <Badge variant={e.type === 'RESTOCK' ? 'secondary' : 'outline'}>{e.type}</Badge>
              </td>
              <td className="px-4 py-2">{e.category?.name ?? '—'}</td>
              <td className="px-4 py-2 text-gray-500">{e.description ?? '—'}</td>
              <td className="px-4 py-2 text-right font-medium">{Number(e.amount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No expenses yet</p>}
    </div>
  )
}
