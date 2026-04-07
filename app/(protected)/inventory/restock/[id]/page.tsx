import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function RestockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
      <div>
        <h1 className="text-2xl font-bold">Restock Batch</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date(batch.date).toLocaleDateString()}</p>
      </div>

      <div className="rounded border overflow-hidden">
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
              <tr key={item.id} className="border-t">
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

      {batch.expense && (
        <p className="text-sm text-gray-500">
          Expense recorded: <span className="font-medium">{Number(batch.expense.amount).toLocaleString()} MMK</span>
        </p>
      )}
    </div>
  )
}
