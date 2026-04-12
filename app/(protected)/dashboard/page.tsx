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

	// Get aggregations for dashboard stats
	const [revenueAgg, inventoryCostResult, expenseAgg, lowStockMeds, nearExpiredItems] = await Promise.all([
		// Revenue: sum of payment amounts
		prisma.patientSession.aggregate({
			where: { date: { gte: start, lte: end }, deletedAt: null },
			_sum: { paymentAmount: true },
			_count: { id: true },
			_max: { paymentAmount: true },
		}),
		// Inventory cost: sum of (quantity * unitCost) for sessions in date range
		prisma.$queryRaw<[{ total: string }]>`
      SELECT COALESCE(SUM(sm.quantity * sm."unitCost"), 0)::text AS total
      FROM "SessionMedication" sm
      JOIN "PatientSession" ps ON ps.id = sm."sessionId"
      WHERE ps.date >= ${start} AND ps.date <= ${end}
        AND ps."deletedAt" IS NULL
    `,
		// Expenses: sum of amounts
		prisma.expense.aggregate({
			where: { date: { gte: start, lte: end }, type: 'MANUAL' },
			_sum: { amount: true },
		}),
		// Low stock medications
		prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold AND "deletedAt" IS NULL
    `,
		// Near expired items
		prisma.restockBatchItem.findMany({
			where: { expiryDate: { not: null, lte: in30Days } },
			include: { medication: { select: { id: true, name: true } }, restockBatch: { select: { id: true } } },
			orderBy: { expiryDate: 'asc' },
		}),
	])

	// Extract stats from aggregations
	const revenue = Number(revenueAgg._sum.paymentAmount ?? 0)
	const sessionCount = revenueAgg._count.id
	const maxSessionAmount = revenueAgg._max.paymentAmount ? Number(revenueAgg._max.paymentAmount) : 0
	const inventoryCost = Number(inventoryCostResult[0].total)
	const adjustedExpenses = Number(expenseAgg._sum.amount ?? 0)
	const netProfit = revenue - inventoryCost - adjustedExpenses

	// Get new patient count (patients with first session in the date range)
	const newPatientSessions = await prisma.patientSession.groupBy({
		by: ['patientId'],
		where: { date: { gte: start, lte: end }, deletedAt: null },
		_min: { date: true },
	})
	const newPatientCount = newPatientSessions.filter(p => p._min.date! >= start).length

	// Get unique medication count
	const uniqueMedCount = (await prisma.sessionMedication.findMany({
		where: { session: { date: { gte: start, lte: end }, deletedAt: null } },
		distinct: ['medicationId'],
		select: { medicationId: true },
	})).length

	// Get top expense category
	const topExpenseCategories = await prisma.expense.groupBy({
		by: ['categoryId'],
		where: { date: { gte: start, lte: end }, type: 'MANUAL' },
		_sum: { amount: true },
		orderBy: { _sum: { amount: 'desc' } },
		take: 1,
	})
	const topExpenseCategory = topExpenseCategories.length > 0 && topExpenseCategories[0].categoryId
		? await prisma.expenseCategory.findUnique({
				where: { id: topExpenseCategories[0].categoryId },
				select: { name: true },
		  }).then(cat => cat ? [cat.name, Number(topExpenseCategories[0]._sum.amount ?? 0)] as [string, number] : null)
		: null

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
