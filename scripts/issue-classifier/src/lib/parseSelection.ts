import { z } from 'zod'

/** Self-reported confidence levels, in ascending order. Reported and measured, but nothing is gated on them. */
export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const

export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

/** Schema for the self-reported confidence accompanying a milestone selection. */
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS)

/**
 * The repository labels that say what kind of work an issue is, one of which the classifier applies.
 *
 * One label, not several: of the 800 most recent issues, 752 carry exactly one of these and only 10
 * carry two, so the kind of an issue is a choice rather than a set of independent flags. The six that
 * do overlap — mostly `refactor` with `test` — lose their second label here, which is one click to
 * restore and much cheaper than a taxonomy that invites the model to apply `bug` and `feature` at
 * once.
 *
 * Kept here beside the schema that validates them so the list the model is offered, the list a vote
 * is checked against, and the list that reaches GitHub cannot drift apart.
 */
export const LABELS = ['bug', 'feature', 'performance', 'refactor', 'test', 'documentation', 'agent'] as const

export type Label = (typeof LABELS)[number]

/**
 * Schema for a single model response.
 *
 * The request constrains the model with the strict JSON schema from buildResponseFormat below, so a
 * conforming reply always carries every field with a valid value and this schema accepts it as a
 * strict subset. The leniencies here are the backstop for the replies the guarantee does not cover
 * — a reply truncated at the token limit parses as no JSON at all, and a model that does not
 * support structured outputs fails the request rather than degrading — and the layers are
 * deliberate: the wire contract can weaken without votes being thrown away for deviations that have
 * a safe reading.
 *
 * `milestone` and `confidence` are both required, because both drive the decision: a response
 * missing either one cannot be acted on, and per the workflow spec a missing field makes the output
 * invalid. `milestone` is nullable rather than optional — an explicit null is the model's way of
 * saying no existing milestone fits, which is a real answer and not a missing field. `rationale`
 * only feeds the audit trail and the question posted to a human, so it defaults rather than
 * invalidating an otherwise usable vote.
 *
 * `label` drives a decision too — it is what gets applied to the issue — yet it is neither required
 * nor a plain default, because the rule that governs the others is not "required if it decides
 * something" but "required when the absence has no safe reading". Absence here has one: no label.
 * `catch` extends that to a malformed value, so a hallucinated `"chore"` or a stray number reads as
 * "the model did not name a kind" rather than invalidating the vote. The alternative costs more than
 * it buys: it would throw the whole vote away, losing its milestone too, to avoid a mislabeling a
 * maintainer can undo in one click.
 */
export const SelectionResponseSchema = z.object({
  rationale: z.string().default(''),
  milestone: z.string().nullable(),
  confidence: ConfidenceSchema,
  label: z.enum(LABELS).nullable().catch(null),
  secondChoice: z.string().nullish(),
})

export type SelectionResponse = z.infer<typeof SelectionResponseSchema>

/**
 * Builds the Chat Completions `response_format` that constrains every sample to the response schema
 * (OpenAI Structured Outputs, `strict: true`). Built per run rather than kept as a constant because
 * `milestone` and `secondChoice` are enums of the currently open milestone titles: the "copied
 * verbatim, or null" instruction the prompt already gives becomes something the model cannot
 * disobey, so a vote can no longer be lost to an invented, closed, or dash-suffixed title. Behind
 * it, matchMilestone and the vote-dropping in tallyVotes remain as backstops rather than as the
 * front line.
 *
 * Strict mode requires every property to be listed in `required`, so "the model may decline" is
 * expressed as a nullable type — null in the enum plus a `["…", "null"]` type — never as an absent
 * field. Property order is meaningful: a strict schema emits keys in the order declared here, which
 * is what keeps `rationale` first so the model reasons before committing to a milestone.
 */
export const buildResponseFormat = (milestoneTitles: string[]) => {
  // Declared separately so `required` can be derived from it: strict mode rejects a schema whose
  // required list does not name every property, and deriving the list makes that rejection
  // unrepresentable rather than a runtime error waiting on the next added field.
  const properties = {
    rationale: { type: 'string' },
    milestone: { type: ['string', 'null'], enum: [...milestoneTitles, null] },
    confidence: { type: 'string', enum: [...CONFIDENCE_LEVELS] },
    label: { type: ['string', 'null'], enum: [...LABELS, null] },
    secondChoice: { type: ['string', 'null'], enum: [...milestoneTitles, null] },
  }
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'milestone_selection',
      strict: true,
      schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
    },
  }
}

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
