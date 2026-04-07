import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { SessionTable } from '@/components/sessions/session-table'

export default async function SessionsPage() {
  const sessions = await prisma.patientSession.findMany({
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Button asChild><Link href="/sessions/new">New Session</Link></Button>
      </div>
      <SessionTable sessions={sessions.map(s => ({ ...s, paymentAmount: Number(s.paymentAmount) }))} />
    </div>
  )
}
