import { z } from 'zod'

export const createExpenseSchema = z.object({
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().datetime(),
})

export const updateExpenseSchema = createExpenseSchema.partial()
