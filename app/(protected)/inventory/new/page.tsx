'use client'
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MedicationForm, type MedicationFormData } from '@/components/inventory/medication-form'
import { BackButton } from '@/components/layout/back-button'

export default function NewMedicationPage() {
  const router = useRouter()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetch('/api/settings/medication-category').then(r => r.json()).then(setCategories)
  }, [])

  async function handleSubmit(data: MedicationFormData) {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) router.push('/inventory')
  }

  return (
    <div className="space-y-4">
      <BackButton label="Inventory" />
      <h1 className="text-2xl font-bold">Add Medication</h1>
      <MedicationForm categories={categories} onSubmit={handleSubmit} submitLabel="Add Medication" />
    </div>
  )
}
