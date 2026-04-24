import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { resolveRange } from '@/lib/date-range'
import { buttonVariants } from '@/components/ui/button'
import { SessionTable } from '@/components/sessions/session-table'
import { PatientTable } from '@/components/patients/patient-table'
import { SessionsTabs } from '@/components/sessions/sessions-tabs'
import { DateRangeSelector } from '@/components/dashboard/date-range-selector'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; preset?: string; from?: string; to?: string; page?: string }>
}) {
  const { tab = 'sessions', preset, from, to, page } = await searchParams
  const { start, end, activePreset } = resolveRange(preset, from, to)
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const skip = (pageNum - 1) * PAGE_SIZE

  const [sessions, sessionsTotal, patients] = await Promise.all([
    tab === 'sessions'
      ? prisma.patientSession.findMany({
          where: { deletedAt: null, date: { gte: start, lte: end } },
          include: {
            patient: true,
            serviceType: true,
            paymentMethod: true,
            medications: { include: { medication: true } },
          },
          orderBy: { date: 'desc' },
          take: PAGE_SIZE,
          skip,
        })
      : ([] as Awaited<ReturnType<typeof prisma.patientSession.findMany>>),
    tab === 'sessions'
      ? prisma.patientSession.count({
          where: { deletedAt: null, date: { gte: start, lte: end } },
        })
      : 0,
    tab === 'patients'
      ? prisma.patient.findMany({
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { sessions: true } } },
          take: PAGE_SIZE,
          skip,
        })
      : ([] as Awaited<ReturnType<typeof prisma.patient.findMany>>),
  ])

  const totalPages = tab === 'sessions' ? Math.ceil(sessionsTotal / PAGE_SIZE) : 1
  const patientsTotal = tab === 'patients' ? patients.length : 0

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
      {tab === 'sessions' && (
        <div className="space-y-3">
          <DateRangeSelector activePreset={activePreset} from={activePreset === 'custom' ? from : undefined} to={activePreset === 'custom' ? to : undefined} basePath="/sessions" />
          {Array.isArray(sessions) && sessions.length > 0 && (
            <div className="text-sm text-gray-600">
              Total: <span className="font-semibold text-gray-900">{sessions.reduce((sum, s) => sum + Number(s.paymentAmount), 0).toLocaleString()} MMK</span>
            </div>
          )}
        </div>
      )}
      <div className="pt-1">
        {tab === 'sessions' && (
          <SessionTable
            sessions={sessions.map(s => ({
              ...s,
              paymentAmount: Number(s.paymentAmount),
              date: s.date.toISOString(),
              medications: s.medications.map(m => ({
                quantity: m.quantity,
                medication: { name: m.medication.name, deletedAt: m.medication.deletedAt?.toISOString() ?? null },
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
      {(totalPages > 1 || (tab === 'patients' && patientsTotal > PAGE_SIZE)) && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            Page {pageNum} of {totalPages > 0 ? totalPages : 1}
          </div>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={`/sessions?tab=${tab}&${new URLSearchParams({ preset, page: String(pageNum - 1) }).toString()}`} className={buttonVariants({ variant: 'outline' })}>
                Previous
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/sessions?tab=${tab}&${new URLSearchParams({ preset, page: String(pageNum + 1) }).toString()}`} className={buttonVariants({ variant: 'outline' })}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
