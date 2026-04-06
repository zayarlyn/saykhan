'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

interface Patient {
  id: string
  name: string
  createdAt: string
  _count: { sessions: number }
}

export function PatientTable({ patients }: { patients: Patient[] }) {
  const [search, setSearch] = useState('')
  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-3">
      <Input placeholder="Search patients…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Total Sessions</th>
              <th className="px-4 py-2">Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/patients/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                </td>
                <td className="px-4 py-2">{p._count.sessions}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No patients found</p>}
      </div>
    </div>
  )
}
