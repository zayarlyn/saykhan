'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Session {
  id: string
  patient: { id: string; name: string }
  serviceType: { name: string }
  paymentMethod: { name: string }
  date: string
  paymentAmount: number
  medications: Array<{ medication: { name: string }; quantity: number }>
}

export function SessionTable({ sessions }: { sessions: Session[] }) {
  const [search, setSearch] = useState('')
  const filtered = sessions.filter(s =>
    s.patient.name.toLowerCase().includes(search.toLowerCase()) ||
    s.serviceType.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <input
        className="border rounded px-3 py-1.5 text-sm w-64"
        placeholder="Search by patient or service…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Medications</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/patients/${s.patient.id}`} className="hover:underline">{s.patient.name}</Link>
                </td>
                <td className="px-4 py-2">{s.serviceType.name}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">
                  {s.medications.map(m => `${m.medication.name} ×${m.quantity}`).join(', ') || '—'}
                </td>
                <td className="px-4 py-2">{s.paymentMethod.name}</td>
                <td className="px-4 py-2 font-medium">{Number(s.paymentAmount).toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(s.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No sessions found</p>}
      </div>
    </div>
  )
}
