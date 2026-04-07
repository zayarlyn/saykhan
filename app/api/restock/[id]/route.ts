import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const batch = await prisma.restockBatch.findUnique({
    where: { id },
    include: {
      items: {
        include: { medication: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      expense: { select: { amount: true } },
    },
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(batch)
}
