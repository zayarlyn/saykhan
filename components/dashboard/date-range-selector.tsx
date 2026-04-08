'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-30', label: 'Last 30 Days' },
]

interface Props {
  activePreset: string
  from?: string
  to?: string
}

export function DateRangeSelector({ activePreset, from, to }: Props) {
  const router = useRouter()
  const isCustom = activePreset === 'custom'
  const [showCustom, setShowCustom] = useState(isCustom)
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function selectPreset(id: string) {
    setShowCustom(false)
    router.push(id === 'this-month' ? '/dashboard' : `/dashboard?preset=${id}`)
  }

  function applyCustom() {
    if (customFrom && customTo) {
      router.push(`/dashboard?from=${customFrom}&to=${customTo}`)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => selectPreset(p.id)}
            className={cn(
              'px-3 py-1 text-sm rounded-full border transition-colors',
              activePreset === p.id
                ? 'bg-[#2e37a4] text-white border-[#2e37a4]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(v => !v)}
          className={cn(
            'px-3 py-1 text-sm rounded-full border transition-colors',
            isCustom
              ? 'bg-[#2e37a4] text-white border-[#2e37a4]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          )}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="border rounded-md px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="border rounded-md px-2 py-1.5 text-sm"
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="px-3 py-1.5 text-sm bg-[#2e37a4] text-white rounded-md disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
