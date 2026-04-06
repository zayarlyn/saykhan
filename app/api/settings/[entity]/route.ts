import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VALID_ENTITIES, createLookupSchema } from '@/lib/validations/settings'

const modelMap = {
  'medication-category': () => prisma.medicationCategory,
  'service-type': () => prisma.serviceType,
  'payment-method': () => prisma.paymentMethod,
  'expense-category': () => prisma.expenseCategory,
} as const

function getModel(entity: string) {
  if (!VALID_ENTITIES.includes(entity as any)) return null
  return (modelMap as any)[entity]()
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  const model = getModel(entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const items = await model.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  const model = getModel(entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = createLookupSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 })

  try {
    const item = await model.create({ data: { name: parsed.data.name } })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Name already exists' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params
  const model = getModel(entity)
  if (!model) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await model.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
