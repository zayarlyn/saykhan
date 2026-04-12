'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

  const handleSelectChange = (preset: string | null) => {
    if (preset === 'custom') {
      setShowCustom(true)
    } else if (preset) {
      const presetObj = PRESETS.find(p => p.id === preset)
      if (presetObj) {
        router.push(presetObj.href)
      }
    }
  }

  return (
    <div className="space-y-2 w-full">
      <Select value={activePreset} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

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
