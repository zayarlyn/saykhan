import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/session-form'
import { BackButton } from '@/components/layout/back-button'
export const dynamic = 'force-dynamic'

export default async function NewSessionPage() {
  const [patients, serviceTypes, paymentMethods, medications] = await Promise.all([
    prisma.patient.findMany({ orderBy: { name: 'asc' } }),
    prisma.serviceType.findMany({ orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.medication.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <BackButton label="Sessions" />
      <h1 className="text-2xl font-bold">New Session</h1>
      <SessionForm
        patients={patients.map(p => ({ id: p.id, name: p.name }))}
        serviceTypes={serviceTypes.map(s => ({ id: s.id, name: s.name }))}
        paymentMethods={paymentMethods.map(p => ({ id: p.id, name: p.name }))}
        medications={medications.map(m => ({ id: m.id, name: m.name, cost: Number(m.cost), sellingPrice: Number(m.sellingPrice), deletedAt: null }))}
      />
    </div>
  )
}
