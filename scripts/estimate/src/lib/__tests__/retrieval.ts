import { describe, expect, it } from 'vitest'
import { type NeighborCandidate, cosineSimilarity, selectNeighbors } from '../retrieval.ts'

/** Builds a minimal candidate with the given expected category and embedding. */
const candidate = (expected: string, embedding: number[]): NeighborCandidate => ({
  sample: { input: { title: expected, body: '', labels: [] }, expected },
  embedding,
})

describe('cosineSimilarity', () => {
  it('is 1 for identical direction vectors', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1)
  })

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1)
  })

  it('returns 0 for a zero-magnitude vector rather than NaN', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0)
  })
})

describe('selectNeighbors', () => {
  const candidates: NeighborCandidate[] = [
    candidate('XXS', [1, 0, 0]), // closest to target
    candidate('M', [0, 1, 0]), // second
    candidate('XXL', [0, 0, 1]), // furthest
  ]
  const target = [0.9, 0.4, 0.1]

  it('returns the top-k most similar, ordered closest-LAST', () => {
    const result = selectNeighbors({ target, candidates, k: 2 })
    // XXS (most similar) and M chosen; ordered closest-last → [M, XXS].
    expect(result.map(s => s.expected)).toEqual(['M', 'XXS'])
  })

  it('returns all candidates when k exceeds the pool, still closest-last', () => {
    const result = selectNeighbors({ target, candidates, k: 10 })
    expect(result.map(s => s.expected)).toEqual(['XXL', 'M', 'XXS'])
  })

  it('returns an empty array when k is 0', () => {
    expect(selectNeighbors({ target, candidates, k: 0 })).toEqual([])
  })

  it('breaks similarity ties by original input order', () => {
    const tied: NeighborCandidate[] = [candidate('S', [1, 0]), candidate('L', [1, 0])]
    const result = selectNeighbors({ target: [1, 0], candidates: tied, k: 2 })
    // Equal similarity → stable order [S, L]; reversed closest-last → [L, S].
    expect(result.map(s => s.expected)).toEqual(['L', 'S'])
  })
})
