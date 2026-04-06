'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/patients', label: 'Patients' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/settings', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 border-r bg-white flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">Saykhan</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'block px-3 py-2 rounded text-sm hover:bg-gray-100',
              pathname.startsWith(href) && 'bg-gray-100 font-medium'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </aside>
  )
}
