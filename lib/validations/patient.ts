import { z } from 'zod'

export const createPatientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export const updatePatientSchema = createPatientSchema.partial()
