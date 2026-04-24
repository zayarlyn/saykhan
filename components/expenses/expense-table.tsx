'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 20

interface Expense {
  id: string
  type: 'RESTOCK' | 'MANUAL'
  category: { name: string } | null
  amount: number
  description: string | null
  date: string
  restockBatchId: string | null
}

export function ExpenseTable({ expenses, onRowClick }: { expenses: Expense[], onRowClick?: (expenseId: string) => void }) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(expenses.length / PAGE_SIZE)
  const paged = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-3">
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paged.map(e => (
          <div key={e.id} onClick={() => router.push(`/expenses/${e.id}`)} className="bg-white border rounded-lg p-3 space-y-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={e.type === 'RESTOCK' ? 'secondary' : 'outline'} className="text-xs">{e.type}</Badge>
                    {e.category && <span className="text-xs text-gray-500">{e.category.name}</span>}
                  </div>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                  {e.type === 'RESTOCK' && e.restockBatchId && (
                    <div
                      onClick={(evt) => evt.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      <Link href={`/inventory/restock/${e.restockBatchId}`}>
                        View Restock
                      </Link>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{Number(e.amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString()}</p>
                </div>
              </div>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No expenses yet</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {paged.map(e => (
              <tr key={e.id} className={`border-t hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(e.id)}>
                <td className="px-4 py-2 text-gray-500">
                  <Link href={`/expenses/${e.id}`} className="hover:underline">
                    {new Date(e.date).toLocaleDateString()}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <Badge variant={e.type === 'RESTOCK' ? 'secondary' : 'outline'}>{e.type}</Badge>
                </td>
                <td className="px-4 py-2">{e.category?.name ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{e.description ?? '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{Number(e.amount).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  {e.type === 'RESTOCK' && e.restockBatchId && (
                    <Link href={`/inventory/restock/${e.restockBatchId}`} className="text-xs text-blue-600 hover:underline">
                      View Restock
                    </Link>
                  )}
                  {e.type === 'MANUAL' && (
                    <Link href={`/expenses/${e.id}`} className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No expenses yet</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
