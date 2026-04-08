'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { UNIT_TYPES } from './medication-form'

const PAGE_SIZE = 20

interface Medication {
  id: string
  name: string
  category: { name: string }
  unitType: string
  cost: number
  sellingPrice: number
  stock: number
  threshold: number
  nearestExpiry: string | null
}

function unitLabel(value: string) {
  return UNIT_TYPES.find(u => u.value === value)?.label ?? value
}

export function MedicationTable({ medications }: { medications: Medication[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = medications.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Search medications…" value={search} onChange={e => handleSearch(e.target.value)} className="max-w-xs" />

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paged.map(med => (
          <Link
            key={med.id}
            href={`/inventory/${med.id}/edit`}
            className="block bg-white border rounded-lg p-3 space-y-1.5 active:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{med.name}</p>
                <p className="text-xs text-gray-500">{med.category.name} · {unitLabel(med.unitType)}</p>
              </div>
              <Badge variant={med.stock > 0 ? 'default' : 'destructive'} className="shrink-0">
                {med.stock > 0 ? 'In Stock' : 'Out'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Stock: <span className="font-medium text-gray-700">{med.stock}</span>
                {med.stock <= med.threshold && <span className="ml-1 text-orange-500">⚠ low</span>}
              </span>
              {med.nearestExpiry && (
                <span>Exp: {new Date(med.nearestExpiry).toLocaleDateString()}</span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No medications found</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Cost</th>
              <th className="px-4 py-2">Sell Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Nearest Expiry</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(med => (
              <tr key={med.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/inventory/${med.id}/edit`)}>
                <td className="px-4 py-2 font-medium">{med.name}</td>
                <td className="px-4 py-2 text-gray-500">{med.category.name}</td>
                <td className="px-4 py-2 text-gray-500">{unitLabel(med.unitType)}</td>
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
