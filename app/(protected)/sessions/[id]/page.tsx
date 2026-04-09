import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { BackButton } from '@/components/layout/back-button'
import { DeleteSessionButton } from '@/components/sessions/delete-session-button'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await prisma.patientSession.findUnique({
    where: { id, deletedAt: null },
    include: {
      patient: true,
      serviceType: true,
      paymentMethod: true,
      medications: { include: { medication: true } },
    },
  })
  if (!session) notFound()

  const total = session.medications.reduce(
    (sum, m) => sum + m.quantity * Number(m.sellingPrice),
    0
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton label="Sessions" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {session.patient
              ? <Link href={`/patients/${session.patient.id}`} className="hover:underline">{session.patient.name}</Link>
              : <span className="text-gray-400">Walk-in</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {session.serviceType.name} &middot;{' '}
            {new Date(session.date).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/sessions/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Edit
          </Link>
          <DeleteSessionButton sessionId={id} />
        </div>
      </div>

      {session.description && (
        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{session.description}</p>
      )}

      <div>
        <h2 className="font-semibold mb-2 text-sm text-gray-700 uppercase tracking-wide">Medications</h2>
        {session.medications.length === 0 ? (
          <p className="text-sm text-gray-400">No medications recorded</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {session.medications.map(m => (
                <div key={m.id} className="rounded border bg-white p-3 text-sm">
                  <p className="font-medium">{m.medication.name}</p>
                  <p className="text-gray-500 mt-0.5">
                    {m.quantity} × {Number(m.sellingPrice).toLocaleString()} ={' '}
                    <span className="font-medium text-gray-800">
                      {(m.quantity * Number(m.sellingPrice)).toLocaleString()} MMK
                    </span>
                  </p>
                </div>
              ))}
              <div className="rounded border bg-gray-50 p-3 text-sm font-medium flex justify-between">
                <span>Total</span>
                <span>{total.toLocaleString()} MMK</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2">Medication</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {session.medications.map(m => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-2">{m.medication.name}</td>
                      <td className="px-4 py-2 text-right">{m.quantity}</td>
                      <td className="px-4 py-2 text-right">{Number(m.sellingPrice).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{(m.quantity * Number(m.sellingPrice)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-medium">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                    <td className="px-4 py-2 text-right">{total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-500">Payment method</span>
          <p className="font-medium">{session.paymentMethod.name}</p>
        </div>
        <div>
          <span className="text-gray-500">Amount paid</span>
          <p className="font-medium">{Number(session.paymentAmount).toLocaleString()} MMK</p>
        </div>
      </div>
    </div>
  )
}
