'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MedicationForm, type MedicationFormData } from '@/components/inventory/medication-form'
import { BackButton } from '@/components/layout/back-button'

interface RestockEntry {
  id: string
  restockBatchId: string
  quantity: number
  costPerUnit: number
  expiryDate: string | null
  restockBatch: { date: string }
}

export default function EditMedicationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [defaultValues, setDefaultValues] = useState<MedicationFormData | null>(null)
  const [restockHistory, setRestockHistory] = useState<RestockEntry[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/medications/${id}`).then(r => r.json()),
      fetch('/api/settings/medication-category').then(r => r.json()),
    ]).then(([med, cats]) => {
      setCategories(cats)
      setDefaultValues({
        name: med.name,
        categoryId: med.categoryId,
        unitType: med.unitType,
        cost: Number(med.cost),
        sellingPrice: Number(med.sellingPrice),
        threshold: med.threshold,
      })
      setRestockHistory(med.restockItems ?? [])
    })
  }, [id])

  async function handleSubmit(data: MedicationFormData) {
    const res = await fetch(`/api/medications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) router.push('/inventory')
  }

  if (!defaultValues) return null

  return (
    <div className="space-y-6">
      <BackButton label="Inventory" />
      <h1 className="text-2xl font-bold">Edit Medication</h1>
      <MedicationForm
        categories={categories}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />

      {restockHistory.length > 0 && (
        <div className="space-y-2 max-w-xl">
          <h2 className="text-base font-semibold">Restock History</h2>
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Cost/Unit</th>
                  <th className="px-3 py-2">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {restockHistory.map(entry => (
                  <tr key={entry.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <Link href={`/inventory/restock/${entry.restockBatchId}?highlight=${entry.id}`} className="hover:underline text-[#2e37a4]">
                        {new Date(entry.restockBatch.date).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{entry.quantity}</td>
                    <td className="px-3 py-2">{Number(entry.costPerUnit).toFixed(2)}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
