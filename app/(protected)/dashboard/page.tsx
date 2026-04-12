import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { resolveRange } from '@/lib/date-range'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LowStockList } from '@/components/dashboard/low-stock-list'
import { NearExpiredList } from '@/components/dashboard/near-expired-list'
import { DateRangeSelector } from '@/components/dashboard/date-range-selector'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ preset?: string; from?: string; to?: string }>
}) {
	const { preset, from, to } = await searchParams
	const { start, end, activePreset } = resolveRange(preset, from, to)

	const now = new Date()
	const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

	const [sessions, expenses, lowStockMeds, nearExpiredItems] = await Promise.all([
		prisma.patientSession.findMany({
			where: { date: { gte: start, lte: end } },
			include: { medications: true },
		}),
		prisma.expense.findMany({
			where: { date: { gte: start, lte: end }, type: 'MANUAL' },
			include: { category: { select: { name: true } } },
		}),
		prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold
    `,
		prisma.restockBatchItem.findMany({
			where: { expiryDate: { not: null, lte: in30Days } },
			include: { medication: { select: { id: true, name: true } }, restockBatch: { select: { id: true } } },
			orderBy: { expiryDate: 'asc' },
		}),
	])

	type Session = (typeof sessions)[number]
	type SessionMed = Session['medications'][number]
	const revenue = sessions.reduce((sum: number, s: Session) => sum + Number(s.paymentAmount), 0)
	const inventoryCost = sessions.reduce((sum: number, s: Session) => sum + s.medications.reduce((mSum: number, m: SessionMed) => mSum + m.quantity * Number(m.unitCost), 0), 0)
	const adjustedExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
	const netProfit = revenue - inventoryCost - adjustedExpenses

	// Revenue details
	const sessionCount = sessions.length
	const maxSessionAmount = sessions.length > 0 ? Math.max(...sessions.map(s => Number(s.paymentAmount))) : 0
	const patientIds = [...new Set(sessions.map(s => s.patientId))]
	const patientFirstSessions = patientIds.length > 0
		? await prisma.patientSession.groupBy({
				by: ['patientId'],
				where: { patientId: { in: patientIds } },
				_min: { date: true },
		  })
		: []
	const newPatientCount = patientFirstSessions.filter(p => p._min.date! >= start).length

	// Inventory cost details
	const uniqueMedCount = new Set(sessions.flatMap(s => s.medications.map(m => m.medicationId))).size

	// Expense details
	const categoryTotals = expenses.reduce((acc, e) => {
		const key = e.category?.name ?? 'Uncategorized'
		acc[key] = (acc[key] ?? 0) + Number(e.amount)
		return acc
	}, {} as Record<string, number>)
	const topExpenseCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] ?? null

	return (
		<div className='space-y-6'>
			<Suspense>
				<DateRangeSelector
					activePreset={activePreset}
					from={activePreset === 'custom' ? from : undefined}
					to={activePreset === 'custom' ? to : undefined}
				/>
			</Suspense>
			<LowStockList items={lowStockMeds.map((m) => ({ ...m, stock: Number(m.stock), threshold: Number(m.threshold) }))} />
			<NearExpiredList
				items={nearExpiredItems.map((item) => ({
					id: item.id,
					medicationId: item.medication.id,
					medicationName: item.medication.name,
					restockBatchId: item.restockBatch.id,
					quantity: item.quantity,
					expiryDate: item.expiryDate!,
				}))}
			/>
			<SummaryCards stats={{
				revenue, inventoryCost, adjustedExpenses, netProfit,
				sessionCount, maxSessionAmount, newPatientCount,
				uniqueMedCount,
				topExpenseCategory,
			}} />
		</div>
	)
}
