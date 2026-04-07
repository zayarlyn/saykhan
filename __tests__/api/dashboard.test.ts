import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/dashboard/route'
import { NextRequest } from 'next/server'

describe('GET /api/dashboard', () => {
  let medId: string
  let catId: string
  let patientId: string
  let stId: string
  let pmId: string
  let expCatId: string
  let restockBatchId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Dash Cat' } })
    catId = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Aspirin Dash', categoryId: cat.id, cost: 1.0, sellingPrice: 3.0, stock: 5, threshold: 10 },
    })
    medId = med.id

    const patient = await prisma.patient.create({ data: { name: 'Dash Patient' } })
    patientId = patient.id
    const st = await prisma.serviceType.create({ data: { name: 'Dash Service' } })
    stId = st.id
    const pm = await prisma.paymentMethod.create({ data: { name: 'Dash Cash' } })
    pmId = pm.id

    await prisma.patientSession.create({
      data: {
        patientId: patient.id,
        serviceTypeId: st.id,
        paymentMethodId: pm.id,
        date: new Date(),
        paymentAmount: 10000,
        medications: {
          create: [{ medicationId: medId, quantity: 2, unitCost: 1.0, sellingPrice: 3.0 }],
        },
      },
    })

    const expCat = await prisma.expenseCategory.create({ data: { name: 'Dash Expense Cat' } })
    expCatId = expCat.id
    await prisma.expense.create({
      data: { type: 'MANUAL', amount: 3000, date: new Date(), categoryId: expCat.id },
    })

    const restockBatch = await prisma.restockBatch.create({ data: { date: new Date() } })
    restockBatchId = restockBatch.id
    await prisma.expense.create({
      data: { type: 'RESTOCK', amount: 5000, date: new Date(), restockBatchId: restockBatch.id },
    })
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany({ where: { session: { patient: { name: 'Dash Patient' } } } })
    await prisma.patientSession.deleteMany({ where: { patient: { name: 'Dash Patient' } } })
    await prisma.expense.deleteMany({ where: { restockBatchId } })
    await prisma.expense.deleteMany({ where: { categoryId: expCatId } })
    await prisma.restockBatch.deleteMany({ where: { id: restockBatchId } })
    await prisma.medication.deleteMany({ where: { id: medId } })
    await prisma.medicationCategory.deleteMany({ where: { id: catId } })
    await prisma.patient.deleteMany({ where: { name: 'Dash Patient' } })
    await prisma.serviceType.deleteMany({ where: { name: 'Dash Service' } })
    await prisma.paymentMethod.deleteMany({ where: { name: 'Dash Cash' } })
    await prisma.expenseCategory.deleteMany({ where: { id: expCatId } })
    await prisma.$disconnect()
  })

  it('returns correct monthly figures, excludes restock from adjustedExpenses', async () => {
    const req = new NextRequest('http://localhost/api/dashboard')
    const res = await GET(req)
    const data = await res.json()

    expect(data.revenue).toBe(10000)
    expect(data.inventoryCost).toBe(2)
    expect(data.adjustedExpenses).toBe(3000)
    expect(data.netProfit).toBe(6998)
  })

  it('includes low-stock medications', async () => {
    const req = new NextRequest('http://localhost/api/dashboard')
    const res = await GET(req)
    const data = await res.json()

    expect(data.lowStock.some((m: any) => m.id === medId)).toBe(true)
  })
})
