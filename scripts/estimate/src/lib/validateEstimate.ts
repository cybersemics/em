import { z } from 'zod'

/** Valid estimate categories. */
export const EstimateCategorySchema = z.enum(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'])

/** Self-reported confidence level accompanying an estimate. */
export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])

/**
 * Schema for the model response. `estimate` is required; the richer fields are optional and
 * defaulted so a minimal `{ "estimate": "M" }` still validates (resilience against a model that
 * omits them). `rationale` is requested first in the prompt so the model reasons before committing
 * to a bucket, but it is not required for a response to be usable.
 */
export const EstimateResponseSchema = z.object({
  rationale: z.string().default(''),
  estimate: EstimateCategorySchema,
  confidence: ConfidenceSchema.default('medium'),
  secondChoice: EstimateCategorySchema.optional(),
})

export type EstimateResponse = z.infer<typeof EstimateResponseSchema>

const MAX_VALIDATION_ATTEMPTS = 3

/**
 * Parses and validates a single raw model output against the estimate schema. Returns the parsed
 * result, or null when the string is not valid JSON or does not match the schema. Non-throwing so
 * callers that aggregate many votes (tallyVotes) can discard bad choices without aborting.
 */
export const parseEstimate = (raw: string): EstimateResponse | null => {
  try {
    return EstimateResponseSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

/** Validates raw model output against the estimate schema. Returns the first valid result or throws after max attempts. */
const validateEstimate = (rawOutputs: string[]): EstimateResponse => {
  for (const raw of rawOutputs.slice(0, MAX_VALIDATION_ATTEMPTS)) {
    const result = parseEstimate(raw)
    if (result) return result
  }
  throw new Error(
    `Failed to validate estimate after ${MAX_VALIDATION_ATTEMPTS} attempts. Raw outputs: ${JSON.stringify(rawOutputs)}`,
  )
}

export default validateEstimate
