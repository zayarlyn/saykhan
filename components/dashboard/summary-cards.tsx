'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
	revenue: number
	inventoryCost: number
	adjustedExpenses: number
	restockCost: number
	netProfit: number
	sessionCount: number
	maxSessionAmount: number
	newPatientCount: number
	uniqueMedCount: number
	topExpenseCategory: [string, number] | null
	openingBalance: number
	closingBalance: number
}

export function SummaryCards({ stats }: { stats: Stats }) {
	const [expanded, setExpanded] = useState<string | null>(null)

	const cards = [
		{
			label: 'Revenue',
			value: stats.revenue,
			color: 'text-green-600',
			details: [
				{ label: 'Sessions', value: stats.sessionCount },
				{ label: 'New patients', value: stats.newPatientCount },
				{ label: 'Highest session', value: stats.maxSessionAmount.toLocaleString() + ' MMK' },
			],
		},
		{
			label: 'Inventory Cost (Medications)',
			value: stats.inventoryCost,
			color: 'text-blue-600',
			details: [{ label: 'Medications used', value: stats.uniqueMedCount }],
		},
		{
			label: 'Other Expenses',
			value: stats.adjustedExpenses,
			color: 'text-orange-600',
			details: stats.topExpenseCategory
				? [{ label: 'Top expense', value: `${stats.topExpenseCategory[0]} — ${stats.topExpenseCategory[1].toLocaleString()} MMK` }]
				: [{ label: 'Top expense', value: '—' }],
		},
		{
			label: 'Restock Cost',
			value: stats.restockCost,
			color: 'text-purple-600',
			details: null,
		},
		{
			label: 'Net Profit',
			value: stats.netProfit,
			color: stats.netProfit >= 0 ? 'text-green-700' : 'text-red-600',
			details: null,
		},
	]

	const openingCard = {
		label: 'Opening Balance',
		value: stats.openingBalance,
		color: 'text-gray-700',
		details: null,
	}

	return (
		<div className='space-y-4'>
			<div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
				{[openingCard, ...cards].map((card) => {
					const isExpanded = expanded === card.label
					const hasDetails = card.details !== null

					return (
						<div
							key={card.label}
							className={cn('bg-white border rounded-lg p-4 space-y-1', hasDetails && 'cursor-pointer select-none', isExpanded && 'ring-1 ring-gray-200')}
							onClick={() => hasDetails && setExpanded(isExpanded ? null : card.label)}
						>
							<div className='flex items-center justify-between gap-1'>
								<p className='text-xs text-gray-500 uppercase tracking-wide leading-tight'>{card.label}</p>
								{hasDetails && <ChevronDown className={cn('size-3.5 text-gray-400 shrink-0 transition-transform', isExpanded && 'rotate-180')} />}
							</div>
							<p className={`text-lg sm:text-2xl font-bold ${card.color} break-words`}>{Number(card.value).toLocaleString()}</p>

							{isExpanded && card.details && (
								<div className='pt-2 border-t space-y-1'>
									{card.details.map((d) => (
										<div key={d.label} className='flex items-center justify-between text-xs gap-2'>
											<span className='text-gray-500'>{d.label}</span>
											<span className='font-medium text-gray-700 text-right break-words'>{d.value}</span>
										</div>
									))}
								</div>
							)}
						</div>
					)
				})}
			</div>

			{(() => {
				const isExpanded = expanded === 'Closing Balance'
				return (
					<div
						className={cn('bg-white border rounded-lg p-4 space-y-1 cursor-pointer select-none', isExpanded && 'ring-1 ring-gray-200')}
						onClick={() => setExpanded(isExpanded ? null : 'Closing Balance')}
					>
						<div className='flex items-center justify-between gap-1'>
							<p className='text-xs text-gray-500 uppercase tracking-wide leading-tight'>Closing Balance</p>
							<ChevronDown className={cn('size-3.5 text-gray-400 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
						</div>
						<p className={`text-lg sm:text-2xl font-bold break-words ${stats.closingBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>{Number(stats.closingBalance).toLocaleString()}</p>
						{isExpanded && (
							<div className='pt-2 border-t space-y-1'>
								{[
									{ label: 'Opening Balance', value: stats.openingBalance },
									{ label: '+ Revenue', value: stats.revenue },
									{ label: '− Inventory Cost', value: stats.inventoryCost },
									{ label: '− Restock Cost', value: stats.restockCost },
								].map((d) => (
									<div key={d.label} className='flex items-center justify-between text-xs gap-2'>
										<span className='text-gray-500'>{d.label}</span>
										<span className='font-medium text-gray-700 text-right'>{Number(d.value).toLocaleString()}</span>
									</div>
								))}
							</div>
						)}
					</div>
				)
			})()}
		</div>
	)
}
