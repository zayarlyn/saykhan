import { prisma } from '@/lib/prisma'
import { PatientTable } from '@/components/patients/patient-table'
export const dynamic = 'force-dynamic'

export default async function PatientsPage() {
  const raw = await prisma.patient.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { sessions: true } } },
  })
  const patients = raw.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Patients</h1>
      <PatientTable patients={patients} />
    </div>
  )
}
