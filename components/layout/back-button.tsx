import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
