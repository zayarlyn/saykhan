import { z } from 'zod'

export const VALID_ENTITIES = [
  'medication-category',
  'service-type',
  'payment-method',
  'expense-category',
] as const

export type EntityType = (typeof VALID_ENTITIES)[number]

export const createLookupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})
