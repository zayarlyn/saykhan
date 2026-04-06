import { prisma } from '@/lib/prisma'
import { RestockForm } from '@/components/inventory/restock-form'

export default async function RestockPage() {
  const medications = await prisma.medication.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Restock Inventory</h1>
      <RestockForm medications={medications} />
    </div>
  )
}
