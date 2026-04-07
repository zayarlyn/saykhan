import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { MedicationTable } from '@/components/inventory/medication-table'
import { InventoryTabs } from '@/components/inventory/inventory-tabs'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'medications' } = await searchParams

  const medications =
    tab === 'medications'
      ? await prisma.medication.findMany({ include: { category: true }, orderBy: { name: 'asc' } })
      : []

  const withExpiry =
    tab === 'medications'
      ? await Promise.all(
          medications.map(async med => {
            const nearestBatch = await prisma.restockBatchItem.findFirst({
              where: { medicationId: med.id, expiryDate: { gte: new Date() } },
              orderBy: { expiryDate: 'asc' },
            })
            return {
              ...med,
              cost: Number(med.cost),
              sellingPrice: Number(med.sellingPrice),
              nearestExpiry: nearestBatch?.expiryDate?.toISOString() ?? null,
            }
          })
        )
      : []

  const restocks =
    tab === 'restocks'
      ? await prisma.restockBatch.findMany({
          include: {
            _count: { select: { items: true } },
            expense: { select: { amount: true } },
          },
          orderBy: { date: 'desc' },
        })
      : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2 shrink-0">
          <Link href="/inventory/restock"><Button variant="outline" size="sm">Restock</Button></Link>
          <Link href="/inventory/new"><Button size="sm">Add</Button></Link>
        </div>
      </div>

      <Suspense>
        <InventoryTabs />
      </Suspense>

      {tab === 'medications' && <MedicationTable medications={withExpiry} />}

      {tab === 'restocks' && (
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Total Cost</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {restocks.map(batch => (
                <tr key={batch.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(batch.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{batch._count.items}</td>
                  <td className="px-4 py-2 text-right">
                    {batch.expense ? Number(batch.expense.amount).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/inventory/restock/${batch.id}`} className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {restocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No restock batches yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
