'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function MonthNav({ month }: { month: string }) {
  const router = useRouter()

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = month === currentMonth

  function navigate(offset: number) {
    const [year, mon] = month.split('-').map(Number)
    const d = new Date(year, mon - 1 + offset, 1)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(next === currentMonth ? '/dashboard' : `/dashboard?month=${next}`)
  }

  const [year, mon] = month.split('-').map(Number)
  const label = new Date(year, mon - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold px-1">{label}</h1>
        <button
          onClick={() => navigate(1)}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      {!isCurrentMonth && (
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-blue-600 hover:underline"
        >
          Current month
        </button>
      )}
    </div>
  )
}
