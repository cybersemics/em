import { describe, expect, it } from 'vitest'
import { type EmbeddingCache, contentHash, embeddingText, joinSamplesWithEmbeddings } from '../embeddingCache.ts'
import type { EstimateSample } from '../loadSamples.ts'

const MODEL = 'text-embedding-3-small'

/** Builds a sample with a filename and body used to derive its content hash. */
const sample = (file: string, body: string): EstimateSample => ({
  input: { title: 'T', body, labels: ['bug'] },
  expected: 'M',
  file,
})

describe('embeddingText', () => {
  it('renders a stable title/labels/body representation', () => {
    const text = embeddingText({ title: 'Fix bug', body: 'broken', labels: ['a', 'b'] })
    expect(text).toBe('Title: Fix bug\nLabels: a, b\nBody:\nbroken')
  })
})

describe('contentHash', () => {
  it('is deterministic for the same input', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'))
  })

  it('differs for different input', () => {
    expect(contentHash('abc')).not.toBe(contentHash('abd'))
  })
})

describe('joinSamplesWithEmbeddings', () => {
  const s = sample('issue-1.json', 'body one')
  const hash = contentHash(embeddingText(s.input))

  it('attaches a fresh cached embedding when filename, model, and hash match', () => {
    const cache: EmbeddingCache = { model: MODEL, entries: { 'issue-1.json': { hash, embedding: [1, 2, 3] } } }
    const [joined] = joinSamplesWithEmbeddings([s], cache)
    expect(joined.embedding).toEqual([1, 2, 3])
  })

  it('leaves the embedding undefined when the content hash is stale', () => {
    const cache: EmbeddingCache = {
      model: MODEL,
      entries: { 'issue-1.json': { hash: 'stale', embedding: [1, 2, 3] } },
    }
    const [joined] = joinSamplesWithEmbeddings([s], cache)
    expect(joined.embedding).toBeUndefined()
  })

  it('leaves the embedding undefined when the cache model differs', () => {
    const cache: EmbeddingCache = {
      model: 'some-other-model',
      entries: { 'issue-1.json': { hash, embedding: [1, 2, 3] } },
    }
    const [joined] = joinSamplesWithEmbeddings([s], cache)
    expect(joined.embedding).toBeUndefined()
  })

  it('leaves the embedding undefined on a cache miss', () => {
    const cache: EmbeddingCache = { model: MODEL, entries: {} }
    const [joined] = joinSamplesWithEmbeddings([s], cache)
    expect(joined.embedding).toBeUndefined()
  })
})
