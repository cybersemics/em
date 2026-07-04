import { z } from 'zod'

/** Valid estimate categories. */
export const EstimateCategorySchema = z.enum(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'])

/** Schema for the model response. */
export const EstimateResponseSchema = z.object({
  estimate: EstimateCategorySchema,
})

export type EstimateResponse = z.infer<typeof EstimateResponseSchema>

const MAX_VALIDATION_ATTEMPTS = 3

/** Validates raw model output against the estimate schema. Returns the parsed result or throws after max attempts. */
const validateEstimate = (rawOutputs: string[]): EstimateResponse => {
  for (const raw of rawOutputs.slice(0, MAX_VALIDATION_ATTEMPTS)) {
    try {
      const parsed = JSON.parse(raw)
      const result = EstimateResponseSchema.parse(parsed)
      return result
    } catch {
      continue
    }
  }
  throw new Error(
    `Failed to validate estimate after ${MAX_VALIDATION_ATTEMPTS} attempts. Raw outputs: ${JSON.stringify(rawOutputs)}`,
  )
}

export default validateEstimate
