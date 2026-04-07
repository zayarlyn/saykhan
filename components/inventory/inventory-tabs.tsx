'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function InventoryTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'medications'

  return (
    <div className="flex gap-1 border-b">
      {(['medications', 'restocks'] as const).map(t => (
        <button
          key={t}
          onClick={() => router.push(`/inventory?tab=${t}`)}
          className={[
            'px-4 py-2 text-sm font-medium capitalize -mb-px border-b-2 transition-colors',
            tab === t
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
