'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MedicationForm } from '@/components/inventory/medication-form'
import { BackButton } from '@/components/layout/back-button'

export default function EditMedicationPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState([])
  const [defaultValues, setDefaultValues] = useState<any>(null)

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
    })
  }, [id])

  async function handleSubmit(data: any) {
    const res = await fetch(`/api/medications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) router.push('/inventory')
  }

  if (!defaultValues) return null

  return (
    <div className="space-y-4">
      <BackButton label="Inventory" />
      <h1 className="text-2xl font-bold">Edit Medication</h1>
      <MedicationForm
        categories={categories}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  )
}
