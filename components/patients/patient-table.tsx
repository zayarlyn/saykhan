'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 20

interface Patient {
  id: string
  name: string
  createdAt: string
  _count: { sessions: number }
}

export function PatientTable({ patients }: { patients: Patient[] }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <Input placeholder="Search patients…" value={search} onChange={e => handleSearch(e.target.value)} className="max-w-xs" />

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paged.map(p => (
          <div key={p.id} className="bg-white border rounded-lg p-3 flex items-center justify-between">
            <div>
              <Link href={`/patients/${p.id}`} className="font-medium text-sm hover:underline">{p.name}</Link>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(p.createdAt).toLocaleDateString('en-US')}</p>
            </div>
            <span className="text-xs text-gray-500">{p._count.sessions} sessions</span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No patients found</p>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Total Sessions</th>
              <th className="px-4 py-2">Registered</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/patients/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-2">{p._count.sessions}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No patients found</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
