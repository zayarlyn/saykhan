import { prisma } from '@/lib/prisma'
import { RestockForm } from '@/components/inventory/restock-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditRestockPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!batch) notFound()

  const medications = await prisma.medication.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const defaultValues = {
    date: batch.date.toISOString(),
    items: batch.items.map((item) => ({
      medicationId: item.medicationId,
      quantity: item.quantity,
      costPerUnit: Number(item.costPerUnit),
      expiryDate: item.expiryDate?.toISOString() || '',
    })),
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Edit Restock Batch</h1>
        <p className="text-sm text-gray-600">Modify the batch date and items. Stock will be adjusted accordingly.</p>
      </div>
      <RestockForm
        medications={medications}
        mode="edit"
        restockId={id}
        defaultValues={defaultValues}
      />
    </div>
  )
}
