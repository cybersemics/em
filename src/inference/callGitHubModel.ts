/** Calls a GitHub Models inference endpoint with the given prompt. */
const callGitHubModel = async (prompt: string, token: string): Promise<string> => {
  const response = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub Models API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { choices: { message: { content: string } }[] }
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('No content in GitHub Models response')
  }

  return content.trim()
}

export default callGitHubModel
