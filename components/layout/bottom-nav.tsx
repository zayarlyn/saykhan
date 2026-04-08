'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Package, Receipt, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#e7e8eb] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                active ? 'text-[#2e37a4]' : 'text-[#9da4b0]'
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
