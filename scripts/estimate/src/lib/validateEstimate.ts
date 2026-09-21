import { z } from 'zod'
import { ESTIMATE_CATEGORIES } from '../everhour/estimates.ts'

/** Valid estimate categories, derived from the canonical scale so the two lists cannot drift apart. */
export const EstimateCategorySchema = z.enum(ESTIMATE_CATEGORIES)

/** Self-reported confidence levels accompanying an estimate. */
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const

/** Schema for the self-reported confidence accompanying an estimate. */
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS)

/**
 * Schema for the model response.
 *
 * The request constrains the model with the strict JSON schema in RESPONSE_FORMAT below, so a
 * conforming reply always carries every field with a valid value and this schema accepts it as a
 * strict subset. The leniencies here are the backstop for the replies the guarantee does not cover
 * — a reply truncated at the token limit parses as no JSON at all, and a model that does not
 * support structured outputs fails the request rather than degrading — and they are deliberate: a
 * minimal `{ "estimate": "M" }` still validates, so the wire contract can weaken without votes
 * being thrown away for omissions that have a safe reading. `rationale` is requested first in the
 * prompt so the model reasons before committing to a bucket, but it is not required for a response
 * to be usable.
 * `secondChoice` accepts null as well as absence, because the strict schema requires every property
 * and null is the only way a conforming reply can decline to give one.
 */
export const EstimateResponseSchema = z.object({
  rationale: z.string().default(''),
  estimate: EstimateCategorySchema,
  confidence: ConfidenceSchema.default('medium'),
  secondChoice: EstimateCategorySchema.nullish(),
})

export type EstimateResponse = z.infer<typeof EstimateResponseSchema>

/**
 * The response properties offered to the model, declared separately so `required` can be derived:
 * strict mode rejects a schema whose required list does not name every property, and deriving the
 * list makes that rejection unrepresentable rather than a runtime error waiting on the next added
 * field. Property order is meaningful: a strict schema emits keys in the order declared here, which
 * is what keeps `rationale` first so the model reasons before committing to a bucket.
 */
const properties = {
  rationale: { type: 'string' },
  estimate: { type: 'string', enum: [...ESTIMATE_CATEGORIES] },
  confidence: { type: 'string', enum: [...CONFIDENCE_LEVELS] },
  secondChoice: { type: ['string', 'null'], enum: [...ESTIMATE_CATEGORIES, null] },
}

/**
 * The Chat Completions `response_format` that constrains every sample to the response schema
 * (OpenAI Structured Outputs, `strict: true`). The JSON-object shape the prompt already requests
 * becomes something the model cannot disobey, so a vote can no longer be lost to a hallucinated
 * category or a missing field. Behind it, the lenient parsing in parseEstimate remains as the
 * backstop rather than as the front line. A constant rather than built per run, unlike the issue
 * classifier's buildResponseFormat, because the category scale is fixed — nothing in the schema
 * varies between requests.
 *
 * Strict mode requires every property to be listed in `required`, so "no second choice" is
 * expressed as a nullable type — null in the enum plus a `["string", "null"]` type — never as an
 * absent field.
 */
export const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'issue_estimate',
    strict: true,
    schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
  },
}

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
