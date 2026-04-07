import { z } from 'zod'

export const sessionMedicationSchema = z.object({
  medicationId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
})

export const createSessionSchema = z.object({
  patientId: z.string().min(1),
  serviceTypeId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  date: z.string().datetime(),
  description: z.string().optional(),
  paymentAmount: z.number().nonnegative(),
  medications: z.array(sessionMedicationSchema),
})

export const updateSessionSchema = createSessionSchema
