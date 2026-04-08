'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'sessions', label: 'Sessions' },
  { key: 'patients', label: 'Patients' },
]

export function SessionsTabs() {
  const searchParams = useSearchParams()
  const active = searchParams.get('tab') ?? 'sessions'

  return (
    <div className="flex gap-1 border-b border-[#e7e8eb]">
      {tabs.map(tab => (
        <Link
          key={tab.key}
          href={`/sessions?tab=${tab.key}`}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            active === tab.key
              ? 'border-[#2e37a4] text-[#2e37a4]'
              : 'border-transparent text-[#6c7688] hover:text-[#0a1b39]'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
