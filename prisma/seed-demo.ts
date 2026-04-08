/**
 * Demo data seed — layered on top of the lookup seed (prisma/seed.ts).
 *
 * Usage:
 *   npx tsx prisma/seed-demo.ts           # seed if not already seeded
 *   npx tsx prisma/seed-demo.ts --reset   # wipe demo data and reseed
 *
 * Requires lookup data to exist first:
 *   npx prisma db seed
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------

const DEMO_PATIENT_NAMES = [
  'Ma Thida Kyaw',
  'Ko Aung Zaw',
  'Ma Hnin Wai',
  'Ko Myint Naing',
  'Daw Khin Lay',
  'U Kyaw Thu',
]

// Medications: [name, category, cost, sellingPrice, stock, threshold]
const DEMO_MEDICATIONS: [string, string, number, number, number, number][] = [
  ['Paracetamol 500mg',     'Pills',         100,  200,  80, 20],
  ['Amoxicillin 500mg',     'Pills',         300,  500,  35, 15],
  ['Metronidazole 250mg',   'Pills',         200,  400,  28, 10],
  ['Omeprazole 20mg',       'Pills',         500,  900,  22, 10],
  ['Ibuprofen 400mg',       'Pills',         150,  300,  45, 15],
  ['Vitamin C 500mg',       'Pills',         100,  200,  60, 20],
  ['Normal Saline 500ml',   'IV',           1500, 3000,  12, 5],
  ['Dextrose 5% 500ml',     'IV',           2000, 3500,   4, 5],  // near threshold → low-stock alert
  ['Dexamethasone Inj 2ml', 'Injections',    800, 1500,  10, 5],
  ['Diazepam Inj 2ml',      'Injections',   1200, 2000,   3, 5],  // below threshold → low-stock alert
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d
}

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ---------------------------------------------------------------------------
// Reset helpers
// ---------------------------------------------------------------------------

async function wipeDemo(patientIds: string[], medicationIds: string[], batchIds: string[]) {
  await prisma.sessionMedication.deleteMany({
    where: { session: { patientId: { in: patientIds } } },
  })
  await prisma.patientSession.deleteMany({ where: { patientId: { in: patientIds } } })
  await prisma.expense.deleteMany({ where: { restockBatchId: { in: batchIds } } })
  await prisma.expense.deleteMany({
    where: {
      type: 'MANUAL',
      description: { contains: '[demo]' },
    },
  })
  await prisma.restockBatchItem.deleteMany({ where: { restockBatchId: { in: batchIds } } })
  await prisma.restockBatch.deleteMany({ where: { id: { in: batchIds } } })
  await prisma.medication.deleteMany({ where: { id: { in: medicationIds } } })
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const reset = process.argv.includes('--reset')

  // Check for required lookups
  const [serviceTypeCount, paymentMethodCount, medCatCount] = await Promise.all([
    prisma.serviceType.count(),
    prisma.paymentMethod.count(),
    prisma.medicationCategory.count(),
  ])
  if (serviceTypeCount === 0 || paymentMethodCount === 0 || medCatCount === 0) {
    console.error('❌  Lookup tables are empty. Run `npx prisma db seed` first.')
    process.exit(1)
  }

  // Load lookups
  const [serviceTypes, paymentMethods, medCategories] = await Promise.all([
    prisma.serviceType.findMany(),
    prisma.paymentMethod.findMany(),
    prisma.medicationCategory.findMany(),
  ])

  const stByName = Object.fromEntries(serviceTypes.map(s => [s.name, s.id]))
  const pmByName = Object.fromEntries(paymentMethods.map(p => [p.name, p.id]))
  const catByName = Object.fromEntries(medCategories.map(c => [c.name, c.id]))

  // Check for existing demo data
  const existingPatient = await prisma.patient.findFirst({
    where: { name: { in: DEMO_PATIENT_NAMES } },
  })

  if (existingPatient && !reset) {
    console.log('Demo data already exists. Use --reset to wipe and recreate.')
    return
  }

  if (reset && existingPatient) {
    console.log('Resetting demo data...')
    const existingPatients = await prisma.patient.findMany({
      where: { name: { in: DEMO_PATIENT_NAMES } },
      select: { id: true },
    })
    const existingMeds = await prisma.medication.findMany({
      where: { name: { in: DEMO_MEDICATIONS.map(m => m[0]) } },
      select: { id: true },
    })
    const existingBatches = await prisma.restockBatch.findMany({
      where: { expense: { description: { contains: '[demo]' } } },
      select: { id: true },
    })
    await wipeDemo(
      existingPatients.map(p => p.id),
      existingMeds.map(m => m.id),
      existingBatches.map(b => b.id),
    )
    console.log('  ✓ Wiped existing demo data')
  }

  // -------------------------------------------------------------------------
  // Patients
  // -------------------------------------------------------------------------
  const patients = await Promise.all(
    DEMO_PATIENT_NAMES.map(name => prisma.patient.create({ data: { name } }))
  )
  console.log(`✓ ${patients.length} patients`)

  // -------------------------------------------------------------------------
  // Medications
  // -------------------------------------------------------------------------
  const medications = await Promise.all(
    DEMO_MEDICATIONS.map(([name, cat, cost, sellingPrice, stock, threshold]) =>
      prisma.medication.create({
        data: {
          name,
          categoryId: catByName[cat],
          cost,
          sellingPrice,
          stock,
          threshold,
        },
      })
    )
  )
  console.log(`✓ ${medications.length} medications`)

  // -------------------------------------------------------------------------
  // Restock batches
  // -------------------------------------------------------------------------

  // Batch 1 — 3 weeks ago, normal items
  const batch1 = await prisma.restockBatch.create({
    data: {
      date: daysAgo(21),
      items: {
        create: [
          { medicationId: medications[0].id, quantity: 100, costPerUnit: 100, expiryDate: daysFromNow(180) },
          { medicationId: medications[1].id, quantity: 50,  costPerUnit: 300, expiryDate: daysFromNow(365) },
          { medicationId: medications[2].id, quantity: 50,  costPerUnit: 200, expiryDate: daysFromNow(365) },
          { medicationId: medications[6].id, quantity: 20,  costPerUnit: 1500, expiryDate: daysFromNow(90) },
          { medicationId: medications[8].id, quantity: 15,  costPerUnit: 800,  expiryDate: daysFromNow(120) },
        ],
      },
    },
  })
  const batch1Cost = 100 * 100 + 50 * 300 + 50 * 200 + 20 * 1500 + 15 * 800
  await prisma.expense.create({
    data: {
      type: 'RESTOCK',
      amount: batch1Cost,
      date: daysAgo(21),
      restockBatchId: batch1.id,
      description: '[demo] restock batch 1',
    },
  })

  // Batch 2 — 5 days ago, with near-expiry items (triggers dashboard alert)
  const batch2 = await prisma.restockBatch.create({
    data: {
      date: daysAgo(5),
      items: {
        create: [
          { medicationId: medications[3].id, quantity: 30,  costPerUnit: 500,  expiryDate: daysFromNow(20) },  // near-expiry
          { medicationId: medications[4].id, quantity: 60,  costPerUnit: 150,  expiryDate: daysFromNow(10) },  // near-expiry
          { medicationId: medications[7].id, quantity: 10,  costPerUnit: 2000, expiryDate: daysFromNow(365) },
          { medicationId: medications[9].id, quantity: 10,  costPerUnit: 1200, expiryDate: daysFromNow(180) },
        ],
      },
    },
  })
  const batch2Cost = 30 * 500 + 60 * 150 + 10 * 2000 + 10 * 1200
  await prisma.expense.create({
    data: {
      type: 'RESTOCK',
      amount: batch2Cost,
      date: daysAgo(5),
      restockBatchId: batch2.id,
      description: '[demo] restock batch 2',
    },
  })

  console.log('✓ 2 restock batches')

  // -------------------------------------------------------------------------
  // Manual expenses (current month)
  // -------------------------------------------------------------------------

  const cashId = pmByName['Cash'] ?? paymentMethods[0].id

  const manualExpenses = [
    { amount: 500000, description: '[demo] Monthly clinic rent',        categoryName: 'Rent' },
    { amount: 150000, description: '[demo] Electricity bill',           categoryName: 'Electricity' },
    { amount: 1000000, description: '[demo] Doctor wages',              categoryName: 'Wages - Doctor' },
    { amount: 200000,  description: '[demo] Office supplies purchase',  categoryName: 'Office Supplies' },
  ]

  const expCats = await prisma.expenseCategory.findMany()
  const expCatByName = Object.fromEntries(expCats.map(c => [c.name, c.id]))

  for (const [i, exp] of manualExpenses.entries()) {
    const catId = expCatByName[exp.categoryName]
    await prisma.expense.create({
      data: {
        type: 'MANUAL',
        amount: exp.amount,
        date: daysAgo(i * 7 + 1),
        categoryId: catId ?? undefined,
        description: exp.description,
      },
    })
  }
  console.log(`✓ ${manualExpenses.length} manual expenses`)

  // -------------------------------------------------------------------------
  // Patient sessions (spread across the past 25 days)
  // -------------------------------------------------------------------------

  type MedInput = { medicationId: string; quantity: number; unitCost: number; sellingPrice: number }

  const sessionTemplates: Array<{
    serviceTypeName: string
    paymentAmount: number
    daysBack: number
    meds: MedInput[]
  }> = [
    {
      serviceTypeName: 'Oral',
      paymentAmount: 100000,
      daysBack: 1,
      meds: [
        { medicationId: medications[0].id, quantity: 10, unitCost: 100, sellingPrice: 200 },
        { medicationId: medications[1].id, quantity: 6,  unitCost: 300, sellingPrice: 500 },
      ],
    },
    {
      serviceTypeName: 'IM 1 dose',
      paymentAmount: 160000,
      daysBack: 2,
      meds: [
        { medicationId: medications[8].id, quantity: 1, unitCost: 800,  sellingPrice: 1500 },
        { medicationId: medications[0].id, quantity: 6, unitCost: 100,  sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'IV',
      paymentAmount: 300000,
      daysBack: 3,
      meds: [
        { medicationId: medications[6].id, quantity: 2,  unitCost: 1500, sellingPrice: 3000 },
        { medicationId: medications[3].id, quantity: 10, unitCost: 500,  sellingPrice: 900 },
      ],
    },
    {
      serviceTypeName: 'Pharmacy Sale',
      paymentAmount: 80000,
      daysBack: 4,
      meds: [
        { medicationId: medications[4].id, quantity: 6,  unitCost: 150, sellingPrice: 300 },
        { medicationId: medications[5].id, quantity: 10, unitCost: 100, sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'Oral',
      paymentAmount: 120000,
      daysBack: 5,
      meds: [
        { medicationId: medications[2].id, quantity: 10, unitCost: 200, sellingPrice: 400 },
        { medicationId: medications[3].id, quantity: 4,  unitCost: 500, sellingPrice: 900 },
      ],
    },
    {
      serviceTypeName: 'Drip',
      paymentAmount: 400000,
      daysBack: 7,
      meds: [
        { medicationId: medications[7].id, quantity: 2,  unitCost: 2000, sellingPrice: 3500 },
        { medicationId: medications[8].id, quantity: 1,  unitCost: 800,  sellingPrice: 1500 },
        { medicationId: medications[0].id, quantity: 10, unitCost: 100,  sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'IM Stemetil',
      paymentAmount: 140000,
      daysBack: 9,
      meds: [
        { medicationId: medications[9].id, quantity: 1, unitCost: 1200, sellingPrice: 2000 },
        { medicationId: medications[0].id, quantity: 6, unitCost: 100,  sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'Oral',
      paymentAmount: 110000,
      daysBack: 10,
      meds: [
        { medicationId: medications[1].id, quantity: 6,  unitCost: 300, sellingPrice: 500 },
        { medicationId: medications[2].id, quantity: 6,  unitCost: 200, sellingPrice: 400 },
        { medicationId: medications[5].id, quantity: 10, unitCost: 100, sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'IV pantoprazole',
      paymentAmount: 240000,
      daysBack: 12,
      meds: [
        { medicationId: medications[6].id, quantity: 1, unitCost: 1500, sellingPrice: 3000 },
        { medicationId: medications[3].id, quantity: 6, unitCost: 500,  sellingPrice: 900 },
      ],
    },
    {
      serviceTypeName: 'Pharmacy Sale',
      paymentAmount: 60000,
      daysBack: 13,
      meds: [
        { medicationId: medications[0].id, quantity: 10, unitCost: 100, sellingPrice: 200 },
        { medicationId: medications[5].id, quantity: 10, unitCost: 100, sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'IM 2 doses',
      paymentAmount: 200000,
      daysBack: 15,
      meds: [
        { medicationId: medications[8].id, quantity: 2, unitCost: 800, sellingPrice: 1500 },
        { medicationId: medications[0].id, quantity: 6, unitCost: 100, sellingPrice: 200 },
      ],
    },
    {
      serviceTypeName: 'Oral',
      paymentAmount: 90000,
      daysBack: 17,
      meds: [
        { medicationId: medications[1].id, quantity: 3, unitCost: 300, sellingPrice: 500 },
        { medicationId: medications[4].id, quantity: 6, unitCost: 150, sellingPrice: 300 },
      ],
    },
    {
      serviceTypeName: 'RBS',
      paymentAmount: 60000,
      daysBack: 18,
      meds: [],
    },
    {
      serviceTypeName: 'Oral',
      paymentAmount: 140000,
      daysBack: 20,
      meds: [
        { medicationId: medications[2].id, quantity: 10, unitCost: 200, sellingPrice: 400 },
        { medicationId: medications[3].id, quantity: 6,  unitCost: 500, sellingPrice: 900 },
      ],
    },
    {
      serviceTypeName: 'IV',
      paymentAmount: 360000,
      daysBack: 22,
      meds: [
        { medicationId: medications[6].id, quantity: 2,  unitCost: 1500, sellingPrice: 3000 },
        { medicationId: medications[9].id, quantity: 1,  unitCost: 1200, sellingPrice: 2000 },
        { medicationId: medications[0].id, quantity: 10, unitCost: 100,  sellingPrice: 200 },
      ],
    },
  ]

  let sessionCount = 0
  for (const [i, tmpl] of sessionTemplates.entries()) {
    const patient = patients[i % patients.length]
    const serviceTypeId = stByName[tmpl.serviceTypeName] ?? serviceTypes[0].id
    const paymentMethodId = i % 5 === 0 ? (pmByName['K Pay'] ?? cashId) : cashId

    await prisma.patientSession.create({
      data: {
        patientId: patient.id,
        serviceTypeId,
        paymentMethodId,
        date: daysAgo(tmpl.daysBack),
        paymentAmount: tmpl.paymentAmount,
        medications: tmpl.meds.length > 0 ? { create: tmpl.meds } : undefined,
      },
    })
    sessionCount++
  }

  console.log(`✓ ${sessionCount} patient sessions`)
  console.log()
  console.log('Demo seed complete.')
  console.log()
  console.log('Summary:')
  console.log(`  Patients:          ${patients.length}`)
  console.log(`  Medications:       ${medications.length} (2 below threshold → low-stock alerts)`)
  console.log(`  Restock batches:   2 (2 near-expiry items → expiry alerts on dashboard)`)
  console.log(`  Manual expenses:   ${manualExpenses.length}`)
  console.log(`  Sessions:          ${sessionCount}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
