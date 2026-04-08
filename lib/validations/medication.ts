import { z } from 'zod'

export const createMedicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  unitType: z.string().default('pcs'),
  cost: z.number().positive('Cost must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  threshold: z.number().int().nonnegative().default(10),
})

export const updateMedicationSchema = createMedicationSchema.partial()
