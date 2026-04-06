import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { MedicationTable } from '@/components/inventory/medication-table'

export default async function InventoryPage() {
  const medications = await prisma.medication.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  })

  const withExpiry = await Promise.all(
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/inventory/restock"><Button variant="outline">Restock</Button></Link>
          <Link href="/inventory/new"><Button>Add Medication</Button></Link>
        </div>
      </div>
      <MedicationTable medications={withExpiry} />
    </div>
  )
}
