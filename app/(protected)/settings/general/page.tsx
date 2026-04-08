import { getClinicName } from '@/lib/clinic-config'
import { ClinicNameForm } from '@/components/settings/clinic-name-form'
import { BackButton } from '@/components/layout/back-button'

export default async function GeneralSettingsPage() {
  const clinicName = await getClinicName()
  return (
    <div className="max-w-2xl space-y-6">
      <BackButton label="Settings" />
      <h1 className="text-2xl font-bold">General</h1>
      <ClinicNameForm initial={clinicName} />
    </div>
  )
}
