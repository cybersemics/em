// Inference tuning constants, overridable via ESTIMATE_* env vars for experimentation.
const MODEL = process.env.ESTIMATE_MODEL ?? 'gpt-4.1'
const TEMPERATURE = process.env.ESTIMATE_TEMPERATURE != null ? Number(process.env.ESTIMATE_TEMPERATURE) : 0
const MAX_VALIDATION_ATTEMPTS =
  process.env.ESTIMATE_MAX_VALIDATION_ATTEMPTS != null ? Number(process.env.ESTIMATE_MAX_VALIDATION_ATTEMPTS) : 3

/** Options for the AI inference call. */
interface CallOptions {
  /** OpenAI API key used to authenticate the inference request. */
  apiKey: string
  prompt: string
  /** Estimation instructions used as the system message. */
  instructions: string
}

/** Calls the OpenAI chat completions API. Returns raw string outputs for validation. */
const inference = async ({ apiKey, prompt, instructions }: CallOptions): Promise<string[]> => {
  const outputs: string[] = []

  for (let attempt = 0; attempt < MAX_VALIDATION_ATTEMPTS; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`OpenAI API error ${response.status}: ${body}`)
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] }
    const content = data.choices?.[0]?.message?.content ?? ''
    outputs.push(content)

    // Try to parse and validate immediately
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>
      if (parsed.estimate) {
        return outputs
      }
    } catch {
      // continue to next attempt
    }
  }

  return outputs
}

export default inference
