'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Receipt,
  Settings,
  LogOut,
  Stethoscope,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex w-[220px] shrink-0 border-r border-[#e7e8eb] bg-white flex-col h-screen sticky top-0 shadow-[1px_0_0_0_#e7e8eb]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#e7e8eb]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2e37a4] shrink-0">
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[#0a1b39] leading-tight">{clinicName}</p>
          <p className="text-[11px] text-[#9da4b0] leading-tight mt-0.5">Clinic Management</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-3">
        <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9da4b0]">
          Main Menu
        </p>
        <nav className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-[#eef0fb] text-[#2e37a4]'
                    : 'text-[#6c7688] hover:bg-[#f5f7fa] hover:text-[#0a1b39]'
                )}
              >
                <Icon
                  className={cn(
                    'w-[15px] h-[15px] shrink-0',
                    active ? 'text-[#2e37a4]' : 'text-[#9da4b0]'
                  )}
                />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-[#e7e8eb]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-[13px] font-medium text-[#6c7688] hover:bg-[#f5f7fa] hover:text-[#0a1b39] transition-all duration-150"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0 text-[#9da4b0]" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
