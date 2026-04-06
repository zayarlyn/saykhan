'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Medication {
  id: string
  name: string
  category: { name: string }
  cost: number
  sellingPrice: number
  stock: number
  threshold: number
  nearestExpiry: string | null
}

export function MedicationTable({ medications }: { medications: Medication[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filtered = medications.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <Input placeholder="Search medications…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Sell Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Nearest Expiry</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(med => (
              <tr key={med.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/inventory/${med.id}/edit`)}>
                <td className="px-4 py-2 font-medium">{med.name}</td>
                <td className="px-4 py-2 text-gray-500">{med.category.name}</td>
                <td className="px-4 py-2">{Number(med.cost).toFixed(2)}</td>
                <td className="px-4 py-2">{Number(med.sellingPrice).toFixed(2)}</td>
                <td className="px-4 py-2">
                  {med.stock}
                  {med.stock <= med.threshold && (
                    <span className="ml-1 text-orange-500 text-xs">⚠ low</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {med.nearestExpiry ? new Date(med.nearestExpiry).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-2">
                  <Badge variant={med.stock > 0 ? 'default' : 'destructive'}>
                    {med.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No medications found</p>}
      </div>
    </div>
  )
}
