'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 20

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
	const [page, setPage] = useState(1)
	const router = useRouter()

	const filtered = sessions.filter((s) => s.patient.name.toLowerCase().includes(search.toLowerCase()) || s.serviceType.name.toLowerCase().includes(search.toLowerCase()))
	const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
	const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

	function handleSearch(value: string) {
		setSearch(value)
		setPage(1)
	}

	return (
		<div className='space-y-3'>
			<Input className='max-w-xs' placeholder='Search by patient or service…' value={search} onChange={(e) => handleSearch(e.target.value)} />

			{/* Mobile cards */}
			<div className='md:hidden space-y-2'>
				{paged.map((s) => (
					<div key={s.id} className='bg-white border rounded-lg p-3 space-y-1.5 cursor-pointer hover:bg-gray-50' onClick={() => router.push(`/sessions/${s.id}`)}>
						<div className='flex items-start justify-between gap-2' onClick={(e) => e.stopPropagation()}>
							<Link href={`/patients/${s.patient.id}`} className='font-medium text-sm hover:underline'>
								{s.patient.name}
							</Link>
							<span className='text-sm font-semibold shrink-0'>{Number(s.paymentAmount).toLocaleString()}</span>
						</div>
						<div className='text-xs text-gray-500 flex items-center justify-between'>
							<span>{s.serviceType.name}</span>
							<span>{new Date(s.date).toLocaleDateString()}</span>
						</div>
						{s.medications.length > 0 && <p className='text-xs text-gray-400 truncate'>{s.medications.map((m) => `${m.medication.name} ×${m.quantity}`).join(', ')}</p>}
					</div>
				))}
				{filtered.length === 0 && <p className='text-center py-8 text-gray-400 text-sm'>No sessions found</p>}
			</div>

			{/* Desktop table */}
			<div className='hidden md:block rounded border overflow-hidden'>
				<table className='w-full text-sm'>
					<thead className='bg-gray-50 text-left'>
						<tr>
							<th className='px-4 py-2'>Patient</th>
							<th className='px-4 py-2'>Service</th>
							<th className='px-4 py-2'>Medications</th>
							<th className='px-4 py-2'>Method</th>
							<th className='px-4 py-2'>Amount</th>
							<th className='px-4 py-2'>Date</th>
						</tr>
					</thead>
					<tbody>
						{paged.map((s) => (
							<tr key={s.id} className='border-t hover:bg-gray-50 cursor-pointer' onClick={() => router.push(`/sessions/${s.id}`)}>
								<td className='px-4 py-2' onClick={(e) => e.stopPropagation()}>
									<Link href={`/patients/${s.patient.id}`} className='hover:underline'>
										{s.patient.name}
									</Link>
								</td>
								<td className='px-4 py-2'>{s.serviceType.name}</td>
								<td className='px-4 py-2 text-gray-500 text-xs'>{s.medications.map((m) => `${m.medication.name} ×${m.quantity}`).join(', ') || '—'}</td>
								<td className='px-4 py-2'>{s.paymentMethod.name}</td>
								<td className='px-4 py-2 font-medium'>{Number(s.paymentAmount).toLocaleString()}</td>
								<td className='px-4 py-2 text-gray-500'>{new Date(s.date).toLocaleDateString()}</td>
							</tr>
						))}
					</tbody>
				</table>
				{filtered.length === 0 && <p className='text-center py-8 text-gray-400 text-sm'>No sessions found</p>}
			</div>

			<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
		</div>
	)
}
