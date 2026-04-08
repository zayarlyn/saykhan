import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/layout/back-button'

export default async function RestockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ highlight?: string }>
}) {
  const { id } = await params
  const { highlight } = await searchParams
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expense: { select: { amount: true } },
    },
  })
  if (!batch) notFound()

  const totalCost = batch.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.costPerUnit),
    0
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton label="Inventory" />
      <div>
        <h1 className="text-2xl font-bold">Restock Batch</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date(batch.date).toLocaleDateString()}</p>
      </div>

      <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {batch.items.map(item => (
            <div
              key={item.id}
              id={item.id}
              className={`rounded border p-3 text-sm transition-colors ${item.id === highlight ? 'bg-[#eef0fb] border-[#2e37a4] border-2' : 'bg-white'}`}
            >
              <p className="font-medium">{item.medication.name}</p>
              <div className="mt-1 space-y-0.5 text-gray-500">
                <p>Qty: <span className="text-gray-800">{item.quantity}</span></p>
                <p>Cost/unit: <span className="text-gray-800">{Number(item.costPerUnit).toLocaleString()}</span></p>
                {item.expiryDate && (
                  <p>Expiry: <span className="text-gray-800">{new Date(item.expiryDate).toLocaleDateString()}</span></p>
                )}
              </div>
              <p className="mt-1 font-medium">
                Subtotal: {(item.quantity * Number(item.costPerUnit)).toLocaleString()} MMK
              </p>
            </div>
          ))}
          <div className="rounded border bg-gray-50 p-3 text-sm font-medium flex justify-between">
            <span>Total Cost</span>
            <span>{totalCost.toLocaleString()} MMK</span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">Medication</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Cost / Unit</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
                <th className="px-4 py-2 text-right">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {batch.items.map(item => (
                <tr
                  key={item.id}
                  id={item.id}
                  className={`border-t transition-colors ${item.id === highlight ? 'bg-[#eef0fb]' : ''}`}
                >
                  <td className="px-4 py-2">{item.medication.name}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">{Number(item.costPerUnit).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {(item.quantity * Number(item.costPerUnit)).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t font-medium">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right">Total Cost</td>
                <td className="px-4 py-2 text-right">{totalCost.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </>

      {batch.expense && (
        <p className="text-sm text-gray-500">
          Expense recorded: <span className="font-medium">{Number(batch.expense.amount).toLocaleString()} MMK</span>
        </p>
      )}
    </div>
  )
}
