import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/layout/back-button'
export const dynamic = 'force-dynamic'

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      sessions: {
        include: { serviceType: true, paymentMethod: true, medications: { include: { medication: true } } },
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!patient) notFound()

  return (
    <div className="space-y-4 max-w-2xl">
      <BackButton label="Patients" />
      <h1 className="text-2xl font-bold">{patient.name}</h1>
      <p className="text-sm text-gray-500">{patient.sessions.length} session(s)</p>
      <div className="space-y-3">
        {patient.sessions.map(session => (
          <div key={session.id} className="border rounded p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{session.serviceType.name}</span>
              <span className="text-sm text-gray-500">{new Date(session.date).toLocaleString()}</span>
            </div>
            {session.description && <p className="text-sm text-gray-600">{session.description}</p>}
            <div className="flex items-center justify-between text-sm">
              <span>{session.paymentMethod.name}</span>
              <span className="font-medium">MMK {Number(session.paymentAmount).toLocaleString()}</span>
            </div>
            {session.medications.length > 0 && (
              <ul className="text-xs text-gray-500 space-y-0.5">
                {session.medications.map(sm => (
                  <li key={sm.id}>• {sm.medication.name} × {sm.quantity}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {patient.sessions.length === 0 && <p className="text-gray-400 text-sm">No sessions yet.</p>}
      </div>
    </div>
  )
}
