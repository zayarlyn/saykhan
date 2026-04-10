import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { SessionTable } from '@/components/sessions/session-table'
import { PatientTable } from '@/components/patients/patient-table'
import { SessionsTabs } from '@/components/sessions/sessions-tabs'

export const dynamic = 'force-dynamic'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'sessions' } = await searchParams

  const [sessions, patients] = await Promise.all([
    tab === 'sessions'
      ? prisma.patientSession.findMany({
          where: { deletedAt: null },
          include: {
            patient: true,
            serviceType: true,
            paymentMethod: true,
            medications: { include: { medication: true } },
          },
          orderBy: { date: 'desc' },
        })
      : Promise.resolve([]),
    tab === 'patients'
      ? prisma.patient.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { sessions: true } } },
        })
      : Promise.resolve([]),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tab === 'patients' ? 'Patients' : 'Sessions'}</h1>
        {tab === 'sessions' && (
          <Link href="/sessions/new" className={buttonVariants()}>New Session</Link>
        )}
      </div>
      <Suspense>
        <SessionsTabs />
      </Suspense>
      <div className="pt-1">
        {tab === 'sessions' && (
          <SessionTable
            sessions={sessions.map(s => ({
              ...s,
              paymentAmount: Number(s.paymentAmount),
              date: s.date.toISOString(),
              medications: s.medications.map(m => ({
                quantity: m.quantity,
                medication: { name: m.medication.name },
              })),
            }))}
          />
        )}
        {tab === 'patients' && (
          <PatientTable
            patients={patients.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))}
          />
        )}
      </div>
    </div>
  )
}
