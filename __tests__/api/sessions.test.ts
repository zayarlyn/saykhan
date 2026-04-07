import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/sessions/route'
import { PATCH } from '@/app/api/sessions/[id]/route'
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

describe('PATCH /api/sessions/[id]', () => {
  let patientId: string
  let serviceTypeId: string
  let paymentMethodId: string
  let medAId: string
  let medBId: string
  let catId: string
  let sessionId: string

  beforeAll(async () => {
    const cat = await prisma.medicationCategory.create({ data: { name: 'Patch Test Cat' } })
    catId = cat.id
    const medA = await prisma.medication.create({
      data: { name: 'MedA Patch', categoryId: cat.id, cost: 1.0, sellingPrice: 2.0, stock: 10 },
    })
    medAId = medA.id
    const medB = await prisma.medication.create({
      data: { name: 'MedB Patch', categoryId: cat.id, cost: 1.0, sellingPrice: 3.0, stock: 10 },
    })
    medBId = medB.id

    const patient = await prisma.patient.create({ data: { name: 'Patch Patient' } })
    patientId = patient.id
    const st = await prisma.serviceType.create({ data: { name: 'Patch Service' } })
    serviceTypeId = st.id
    const pm = await prisma.paymentMethod.create({ data: { name: 'Patch Payment' } })
    paymentMethodId = pm.id

    // Create a session that uses 3 of medA (stock becomes 7)
    const sess = await prisma.patientSession.create({
      data: {
        patientId,
        serviceTypeId,
        paymentMethodId,
        date: new Date(),
        paymentAmount: 1000,
        medications: {
          create: [{ medicationId: medAId, quantity: 3, unitCost: 1.0, sellingPrice: 2.0 }],
        },
      },
    })
    sessionId = sess.id
    await prisma.medication.update({ where: { id: medAId }, data: { stock: { decrement: 3 } } })
  })

  afterAll(async () => {
    await prisma.sessionMedication.deleteMany({ where: { sessionId } })
    await prisma.patientSession.deleteMany({ where: { id: sessionId } })
    await prisma.medication.deleteMany({ where: { id: { in: [medAId, medBId] } } })
    await prisma.medicationCategory.deleteMany({ where: { id: catId } })
    await prisma.patient.deleteMany({ where: { name: 'Patch Patient' } })
    await prisma.serviceType.deleteMany({ where: { name: 'Patch Service' } })
    await prisma.paymentMethod.deleteMany({ where: { name: 'Patch Payment' } })
  })

  it('restores old stock and deducts new stock on medication change', async () => {
    // Switch from 3x medA to 2x medB
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 2000,
      medications: [{ medicationId: medBId, quantity: 2, unitCost: 1.0, sellingPrice: 3.0 }],
    }
    const req = new NextRequest(`http://localhost/api/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: sessionId }) })
    expect(res.status).toBe(200)

    // medA stock restored: was 7, add back 3 = 10
    const medA = await prisma.medication.findUnique({ where: { id: medAId } })
    expect(medA!.stock).toBe(10)

    // medB stock deducted: was 10, subtract 2 = 8
    const medB = await prisma.medication.findUnique({ where: { id: medBId } })
    expect(medB!.stock).toBe(8)
  })

  it('returns 404 for non-existent session', async () => {
    const body = {
      patientId,
      serviceTypeId,
      paymentMethodId,
      date: new Date().toISOString(),
      paymentAmount: 0,
      medications: [],
    }
    const req = new NextRequest('http://localhost/api/sessions/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
