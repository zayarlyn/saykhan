import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/sessions/route'
import { NextRequest } from 'next/server'

describe('POST /api/sessions', () => {
  let patientId: string
  let serviceTypeId: string
  let paymentMethodId: string
  let medId: string
  let catId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Session Test Cat' } })
    catId = cat.id
    const med = await prisma.medication.create({
      data: { name: 'Ibuprofen Test', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 10 },
    })
    medId = med.id

    const patient = await prisma.patient.create({ data: { name: 'Test Patient Sessions' } })
    patientId = patient.id

    const st = await prisma.serviceType.create({ data: { name: 'Test Service Sessions' } })
    serviceTypeId = st.id

    const pm = await prisma.paymentMethod.create({ data: { name: 'Cash Sessions' } })
    paymentMethodId = pm.id
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany({ where: { session: { patient: { name: 'Test Patient Sessions' } } } })
    await prisma.patientSession.deleteMany({ where: { patient: { name: 'Test Patient Sessions' } } })
    await prisma.medication.deleteMany({ where: { id: medId } })
    await prisma.medicationCategory.deleteMany({ where: { id: catId } })
    await prisma.patient.deleteMany({ where: { name: 'Test Patient Sessions' } })
    await prisma.serviceType.deleteMany({ where: { name: 'Test Service Sessions' } })
    await prisma.paymentMethod.deleteMany({ where: { name: 'Cash Sessions' } })
    await prisma.$disconnect()
  })

  it('creates session and decrements stock', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      description: 'Headache',
      paymentAmount: 5000,
      medications: [{ medicationId: medId, quantity: 3, unitCost: 1.0, sellingPrice: 2.0 }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)

    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(7)
  })

  it('rejects session if stock is insufficient', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 5000,
      medications: [{ medicationId: medId, quantity: 100, unitCost: 1.0, sellingPrice: 2.0 }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(422)

    const med = await prisma.medication.findUnique({ where: { id: medId } })
    expect(med!.stock).toBe(7)
  })
})
