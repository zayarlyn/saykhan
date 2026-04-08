import Link from 'next/link'
import { Settings2, Tags } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/layout/sign-out-button'

const sections = [
  {
    href: '/settings/general',
    icon: Settings2,
    label: 'General',
    description: 'Clinic name and basic configuration',
  },
  {
    href: '/settings/categories',
    icon: Tags,
    label: 'Manage Categories',
    description: 'Medication categories, service types, payment methods, and expense categories',
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="space-y-2">
        {sections.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 bg-white border rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 group-hover:bg-gray-200 transition-colors shrink-0">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="md:hidden pt-2">
        <Separator className="mb-4" />
        <SignOutButton />
      </div>
    </div>
  )
}
