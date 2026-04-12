'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  activePreset: string
  from?: string
  to?: string
  basePath?: string
}

export function DateRangeSelector({ activePreset, from, to, basePath = '/dashboard' }: Props) {
  const router = useRouter()
  const isCustom = activePreset === 'custom'
  const [showCustom, setShowCustom] = useState(isCustom)
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  const PRESETS = [
    { id: 'today', label: 'Today', href: `${basePath}?preset=today` },
    { id: 'yesterday', label: 'Yesterday', href: `${basePath}?preset=yesterday` },
    { id: 'this-week', label: 'This Week', href: `${basePath}?preset=this-week` },
    { id: 'this-month', label: 'This Month', href: basePath },
    { id: 'last-month', label: 'Last Month', href: `${basePath}?preset=last-month` },
    { id: 'last-30', label: 'Last 30 Days', href: `${basePath}?preset=last-30` },
  ]

  function applyCustom() {
    if (customFrom && customTo) {
      router.push(`${basePath}?from=${customFrom}&to=${customTo}`)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <Link
            key={p.id}
            href={p.href}
            onClick={() => setShowCustom(false)}
            className={cn(
              'px-3 py-1 text-sm rounded-full border transition-colors',
              activePreset === p.id
                ? 'bg-[#2e37a4] text-white border-[#2e37a4]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {p.label}
          </Link>
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
