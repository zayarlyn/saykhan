import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { getClinicName } from '@/lib/clinic-config'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const clinicName = await getClinicName()
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar clinicName={clinicName} />
      <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  )
}
