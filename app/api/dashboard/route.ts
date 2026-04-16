import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const [sessions, expenses, lowStock] = await Promise.all([
    prisma.patientSession.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth }, deletedAt: null },
      include: { medications: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.$queryRaw<Array<{ id: string; name: string; stock: number; threshold: number }>>`
      SELECT id, name, stock, threshold FROM "Medication" WHERE stock <= threshold AND "deletedAt" IS NULL
    `,
  ])

  const revenue = sessions.reduce((sum, s) => sum + Number(s.paymentAmount), 0)

  const inventoryCost = sessions.reduce((sum, s) =>
    sum + s.medications.reduce((mSum, m) => mSum + m.quantity * Number(m.unitCost), 0), 0
  )

  const adjustedExpenses = expenses
    .filter(e => e.type === 'MANUAL')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const netProfit = revenue - inventoryCost - adjustedExpenses

  return NextResponse.json({ revenue, inventoryCost, adjustedExpenses, netProfit, lowStock })
}
