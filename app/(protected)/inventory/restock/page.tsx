import { prisma } from '@/lib/prisma'
import { RestockForm } from '@/components/inventory/restock-form'
export const dynamic = 'force-dynamic'

export default async function RestockPage() {
  const medications = await prisma.medication.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Restock Inventory</h1>
      <RestockForm medications={medications.map(m => ({ id: m.id, name: m.name }))} />
    </div>
  )
}
