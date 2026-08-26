import { z } from 'zod'

/** Self-reported confidence levels, in ascending order. Reported and measured, but nothing is gated on them. */
export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const

export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

/** Schema for the self-reported confidence accompanying a milestone selection. */
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS)

/**
 * Schema for a single model response.
 *
 * `milestone` and `confidence` are both required, because both drive the decision: a response
 * missing either one cannot be acted on, and per the workflow spec a missing field makes the output
 * invalid. `milestone` is nullable rather than optional — an explicit null is the model's way of
 * saying no existing milestone fits, which is a real answer and not a missing field. `rationale`
 * only feeds the audit trail and the question posted to a human, so it defaults rather than
 * invalidating an otherwise usable vote.
 *
 * `refactor` drives a decision too — it is what applies the label — yet it is neither required nor a
 * plain default, because the rule that governs the others is not "required if it decides something"
 * but "required when the absence has no safe reading". Absence here has one: the overwhelming
 * majority of issues are not pure refactors, so an omitted flag is the common case restated. `catch`
 * extends that to a malformed one, since `"refactor": "true"` says nothing a missing field does not.
 * The alternative costs more than it buys: a stray string would throw the whole vote away, losing
 * its milestone as well, to avoid mislabeling an issue that a maintainer can unlabel in one click.
 */
export const SelectionResponseSchema = z.object({
  rationale: z.string().default(''),
  milestone: z.string().nullable(),
  confidence: ConfidenceSchema,
  refactor: z.boolean().catch(false),
  secondChoice: z.string().nullish(),
})

export type SelectionResponse = z.infer<typeof SelectionResponseSchema>

/**
 * Parses and validates one raw model output. Returns null when the string is not valid JSON or does
 * not match the schema. Non-throwing, so a caller aggregating several votes can discard a bad one
 * without losing the rest.
 */
const parseSelection = (raw: string): SelectionResponse | null => {
  try {
    return SelectionResponseSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export default parseSelection
