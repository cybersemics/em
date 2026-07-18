import type { EstimateSample } from './loadSamples.ts'

/** A sample paired with its embedding vector, used as a retrieval candidate. */
export interface NeighborCandidate {
  sample: EstimateSample
  embedding: number[]
}

/**
 * Cosine similarity between two equal-length vectors, in [-1, 1]. Returns 0 when either vector is
 * empty or has zero magnitude (an undefined direction cannot be "similar" to anything), which keeps
 * ranking well-defined for degenerate inputs rather than producing NaN.
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Selects the k retrieval candidates most similar to the target embedding, returned ordered
 * closest-LAST. The prompt places examples before the target issue, so putting the most similar
 * neighbor immediately adjacent to the issue gives it the most weight (recency within the example
 * list). Ties in similarity are stable in the input order. Returns at most k samples; fewer if the
 * candidate pool is smaller.
 */
export const selectNeighbors = ({
  target,
  candidates,
  k,
}: {
  target: number[]
  candidates: NeighborCandidate[]
  k: number
}): EstimateSample[] => {
  const scored = candidates.map((candidate, index) => ({
    sample: candidate.sample,
    index,
    similarity: cosineSimilarity(target, candidate.embedding),
  }))

  // Sort by descending similarity to take the top-k, breaking ties by original order for stability.
  const topK = scored.sort((a, b) => b.similarity - a.similarity || a.index - b.index).slice(0, Math.max(0, k))

  // Reverse so the closest neighbor is last (adjacent to the target issue in the prompt).
  return topK.reverse().map(entry => entry.sample)
}
