'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function InventoryTabs() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'medications'

  return (
    <div className="flex gap-1 border-b border-[#e7e8eb]">
      {(['medications', 'restocks'] as const).map(t => (
        <Link
          key={t}
          href={`/inventory?tab=${t}`}
          className={cn(
            'px-4 py-2 text-sm font-medium capitalize -mb-px border-b-2 transition-colors',
            tab === t
              ? 'border-[#2e37a4] text-[#2e37a4]'
              : 'border-transparent text-[#6c7688] hover:text-[#0a1b39]'
          )}
        >
          {t}
        </Link>
      ))}
    </div>
  )
}
