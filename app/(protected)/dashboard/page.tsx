import { prisma } from '@/lib/prisma'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { LowStockList } from '@/components/dashboard/low-stock-list'
import { NearExpiredList } from '@/components/dashboard/near-expired-list'

export default async function DashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [sessions, expenses, lowStockMeds, nearExpiredItems] = await Promise.all([
    prisma.patientSession.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { medications: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold
    `,
    prisma.restockBatchItem.findMany({
      where: { expiryDate: { not: null, lte: in30Days } },
      include: { medication: { select: { name: true } }, restockBatch: { select: { id: true } } },
      orderBy: { expiryDate: 'asc' },
    }),
  ])

  const revenue = sessions.reduce((sum, s) => sum + Number(s.paymentAmount), 0)
  const inventoryCost = sessions.reduce((sum, s) =>
    sum + s.medications.reduce((mSum, m) => mSum + m.quantity * Number(m.unitCost), 0), 0
  )
  const adjustedExpenses = expenses.filter(e => e.type === 'MANUAL').reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = revenue - inventoryCost - adjustedExpenses

  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — {monthName}</h1>
      <LowStockList items={lowStockMeds.map(m => ({ ...m, stock: Number(m.stock), threshold: Number(m.threshold) }))} />
      <NearExpiredList items={nearExpiredItems.map(item => ({
        id: item.id,
        medicationName: item.medication.name,
        restockBatchId: item.restockBatch.id,
        quantity: item.quantity,
        expiryDate: item.expiryDate!,
      }))} />
      <SummaryCards stats={{ revenue, inventoryCost, adjustedExpenses, netProfit }} />
    </div>
  )
}
