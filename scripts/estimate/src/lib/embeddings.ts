// Embedding model used to vectorize samples and target issues for kNN retrieval. Overridable via
// ESTIMATE_EMBEDDING_MODEL. text-embedding-3-small is cheap (1536 dims) and more than adequate for
// ranking a small corpus of issue text.
const EMBEDDING_MODEL = process.env.ESTIMATE_EMBEDDING_MODEL ?? 'text-embedding-3-small'

/** The embedding model in effect, exposed so the cache can record and invalidate on model changes. */
export const embeddingModel = (): string => EMBEDDING_MODEL

/**
 * Embeds a batch of texts in a single OpenAI embeddings request, returning one vector per input in
 * order. Mirrors the fetch/error handling of inference.ts. Throws on a non-OK response so the
 * caller (embed.ts) fails loud; callers that must degrade gracefully (estimateIssue) catch and fall
 * back to the all-samples path.
 */
export const embedTexts = async (apiKey: string, texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) return []

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI embeddings API error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as { data: { index: number; embedding: number[] }[] }
  // The API may return items out of order; sort by index to realign with the input array.
  return [...(data.data ?? [])].sort((a, b) => a.index - b.index).map(item => item.embedding)
}

/** Embeds a single text and returns its vector. */
export const embedText = async (apiKey: string, text: string): Promise<number[]> => {
  const [vector] = await embedTexts(apiKey, [text])
  return vector ?? []
}
