import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PatientTable } from '@/components/patients/patient-table'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const skip = (pageNum - 1) * PAGE_SIZE

  const [raw, patientsTotal] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { sessions: true } } },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.patient.count(),
  ])
  const patients = raw.map(p => ({ ...p, createdAt: p.createdAt.toISOString() }))
  const totalPages = Math.ceil(patientsTotal / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Patients</h1>
      <PatientTable patients={patients} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            Page {pageNum} of {totalPages}
          </div>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={`/patients?page=${pageNum - 1}`} className={buttonVariants({ variant: 'outline' })}>
                Previous
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/patients?page=${pageNum + 1}`} className={buttonVariants({ variant: 'outline' })}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
