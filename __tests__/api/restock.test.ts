import { prisma } from '@/lib/prisma'
import { POST, GET as GET_LIST } from '@/app/api/restock/route'
import { GET as GET_ONE } from '@/app/api/restock/[id]/route'
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

describe('GET /api/restock', () => {
  it('returns list of restock batches', async () => {
    const req = new NextRequest('http://localhost/api/restock', { method: 'GET' })
    const res = await GET_LIST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})

describe('GET /api/restock/[id]', () => {
  let batchId: string
  let categoryId2: string
  let medId2: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Get Restock Cat' } })
    categoryId2 = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Get Restock Med', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 0 },
    })
    medId2 = med.id
    const batch = await prisma.restockBatch.create({
      data: {
        date: new Date(),
        items: { create: [{ medicationId: med.id, quantity: 5, costPerUnit: 2.0 }] },
      },
    })
    batchId = batch.id
  })

  afterAll(async () => {
    await prisma.restockBatchItem.deleteMany({ where: { restockBatchId: batchId } })
    await prisma.restockBatch.deleteMany({ where: { id: batchId } })
    await prisma.medication.deleteMany({ where: { id: medId2 } })
    await prisma.medicationCategory.deleteMany({ where: { id: categoryId2 } })
  })

  it('returns single restock batch with items', async () => {
    const req = new NextRequest(`http://localhost/api/restock/${batchId}`, { method: 'GET' })
    const res = await GET_ONE(req, { params: Promise.resolve({ id: batchId }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe(batchId)
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items[0].medication.name).toBe('Get Restock Med')
  })

  it('returns 404 for non-existent batch', async () => {
    const req = new NextRequest('http://localhost/api/restock/notfound', { method: 'GET' })
    const res = await GET_ONE(req, { params: Promise.resolve({ id: 'notfound' }) })
    expect(res.status).toBe(404)
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
