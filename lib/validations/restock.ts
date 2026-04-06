import { z } from 'zod'

export const restockItemSchema = z.object({
  medicationId: z.string().min(1),
  quantity: z.number().int().positive(),
  costPerUnit: z.number().positive(),
  expiryDate: z.string().datetime().optional().nullable(),
})

export const createRestockSchema = z.object({
  date: z.string().datetime(),
  items: z.array(restockItemSchema).min(1, 'At least one item required'),
})
