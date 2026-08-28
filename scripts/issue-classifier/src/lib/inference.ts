import { buildResponseFormat } from './parseSelection.ts'

// Inference tuning constants, overridable via ISSUE_CLASSIFIER_* env vars for experimentation.
// The model must support Structured Outputs (strict json_schema response_format); one that does not
// fails the request outright rather than degrading to unvalidated output.
const MODEL = process.env.ISSUE_CLASSIFIER_MODEL ?? 'gpt-5.6-terra'
// Number of independent samples to draw per selection for self-consistency voting. Sent as the
// Chat Completions `n` parameter, which bills input once and only multiplies the (tiny) output —
// so voting is cheap here. The modal vote is the selection; the spread is the confidence signal
// that decides whether to assign the milestone or ask a human.
const VOTES = process.env.ISSUE_CLASSIFIER_VOTES != null ? Number(process.env.ISSUE_CLASSIFIER_VOTES) : 5
// Only sent when explicitly set. GPT-5 reasoning models reject a non-default temperature (e.g. 0),
// so it is omitted by default; sampling diversity for voting comes from `n`, not temperature. Set
// ISSUE_CLASSIFIER_TEMPERATURE to override for models that support it.
const TEMPERATURE =
  process.env.ISSUE_CLASSIFIER_TEMPERATURE != null ? Number(process.env.ISSUE_CLASSIFIER_TEMPERATURE) : undefined
// Optional reasoning effort passthrough for reasoning-capable models (e.g. gpt-5.6-terra supports
// none|low|medium|high|xhigh|max). Only sent when explicitly set; otherwise the model default applies.
const REASONING_EFFORT = process.env.ISSUE_CLASSIFIER_REASONING_EFFORT

/** Options for the AI inference call. */
export interface InferenceOptions {
  /** OpenAI API key used to authenticate the inference request. */
  apiKey: string
  prompt: string
  /** Milestone selection instructions used as the system message. */
  instructions: string
  /** Open milestone titles the response schema constrains `milestone` and `secondChoice` to. */
  milestoneTitles: string[]
  /** Number of samples to draw for voting. Defaults to VOTES; overridable per call. */
  votes?: number
}

/**
 * Calls the OpenAI chat completions API, drawing `votes` independent samples in a single request
 * via the `n` parameter. Every sample is constrained to the response schema by Structured Outputs
 * (see buildResponseFormat), so a conforming reply cannot be malformed or name a milestone that is
 * not open. Returns the raw string content of every choice — including a refusal or truncated
 * reply, which arrives as unparseable content — for downstream tallying; aggregation and
 * vote-counting live in tallyVotes.
 */
const inference = async ({
  apiKey,
  prompt,
  instructions,
  milestoneTitles,
  votes = VOTES,
}: InferenceOptions): Promise<string[]> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      n: votes,
      ...(TEMPERATURE != null ? { temperature: TEMPERATURE } : {}),
      ...(REASONING_EFFORT != null ? { reasoning_effort: REASONING_EFFORT } : {}),
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      response_format: buildResponseFormat(milestoneTitles),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  return (data.choices ?? []).map(choice => choice.message?.content ?? '')
}

export default inference
