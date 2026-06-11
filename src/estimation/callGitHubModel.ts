const MODEL = 'gpt-4o-mini'
const TEMPERATURE = 0
const MAX_VALIDATION_ATTEMPTS = 3

/** Options for the GitHub Models call. */
interface CallOptions {
  token: string
  prompt: string
}

/** Calls GitHub Models inference API. Returns raw string outputs for validation. */
const callGitHubModel = async ({ token, prompt }: CallOptions): Promise<string[]> => {
  const outputs: string[] = []

  for (let attempt = 0; attempt < MAX_VALIDATION_ATTEMPTS; attempt++) {
    const response = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [
          {
            role: 'system',
            content:
              'You are an issue estimation assistant. Output only valid JSON with an estimate category. Do not include any other text.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`GitHub Models API error ${response.status}: ${body}`)
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

export default callGitHubModel
