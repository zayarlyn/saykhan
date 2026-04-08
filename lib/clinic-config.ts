import { prisma } from '@/lib/prisma'

export async function getClinicName(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: 'clinicName' } })
  return setting?.value ?? 'Clinic'
}
