'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  )
}
