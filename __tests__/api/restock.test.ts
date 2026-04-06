import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/restock/route'
import { NextRequest } from 'next/server'

describe('POST /api/restock', () => {
  let categoryId: string
  let medId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Restock Test Cat' } })
    categoryId = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Paracetamol Test', categoryId, cost: 1.0, sellingPrice: 2.0, stock: 5 },
    })
    medId = med.id
  })

  afterAll(async () => {
    await prisma.restockBatchItem.deleteMany({ where: { medicationId: medId } })
    await prisma.expense.deleteMany({ where: { restockBatch: { items: { some: { medicationId: medId } } } } })
    await prisma.restockBatch.deleteMany({ where: { items: { some: { medicationId: medId } } } })
    await prisma.medication.deleteMany({ where: { id: medId } })
    await prisma.medicationCategory.deleteMany({ where: { id: categoryId } })
    await prisma.$disconnect()
  })

  it('increments stock and creates expense in a transaction', async () => {
    const body = {
      date: new Date().toISOString(),
      items: [{ medicationId: medId, quantity: 10, costPerUnit: 1.5, expiryDate: '2027-01-01T00:00:00.000Z' }],
    }
    const req = new NextRequest('http://localhost/api/restock', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(15) // was 5, added 10

    const expense = await prisma.expense.findFirst({ where: { type: 'RESTOCK', restockBatch: { items: { some: { medicationId: medId } } } } })
    expect(expense).not.toBeNull()
    expect(Number(expense!.amount)).toBe(15) // 10 * 1.5
  })
})
