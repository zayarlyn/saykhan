import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const medicationCategories = [
  'Pills',
  'Injections',
  'Syringe',
  'Med Equipment',
  'Syrup',
  'Infusion sets',
  'IV',
  'Other',
]

const expenseCategories = [
  'Purchase',
  'Rent',
  'Electricity',
  'Bill',
  'Wages - Doctor',
  'Wages - Accountant',
  'Delivery Fees',
  'Subscriptions',
  'Maintenance',
  'Office Supplies',
  'Other Expenses',
]

const serviceTypes = [
  'Pharmacy Sale',
  'Oral',
  'IM 1 dose',
  'IM 2 doses',
  'IM Stemetil',
  'IM Depo',
  'IM Testosterone/Progesterone',
  'IV',
  'IV pantoprazole',
  'IV Moriamine',
  'IV DZ',
  'Drip',
  'Rabies Vaccine',
  'ATT Vaccine',
  'Amoxil Syrup',
  'Cephalaxin Syrup',
  'Alprazolam',
  'RBS',
  'Blood Group',
  'Jadelle Insertion',
  'Jadelle Removal',
  'Intra-articular Injection',
  'Keloid Injection',
  'Stitching',
  'Home Visit',
]

const paymentMethods = ['Cash', 'K Pay']

async function main() {
  console.log('Seeding lookup tables...')

  for (const name of medicationCategories) {
    await prisma.medicationCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ ${medicationCategories.length} medication categories`)

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ ${expenseCategories.length} expense categories`)

  for (const name of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ ${serviceTypes.length} service types`)

  for (const name of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log(`✓ ${paymentMethods.length} payment methods`)

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
