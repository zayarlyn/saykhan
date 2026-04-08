import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ clinicName: z.string().min(1).max(100) })

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: 'clinicName' } })
  return NextResponse.json({ clinicName: setting?.value ?? 'Clinic' })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })

  await prisma.setting.upsert({
    where: { key: 'clinicName' },
    update: { value: parsed.data.clinicName },
    create: { key: 'clinicName', value: parsed.data.clinicName },
  })
  return NextResponse.json({ ok: true })
}
