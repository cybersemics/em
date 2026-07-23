import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { IssueInput } from './buildPrompt.ts'
import { embeddingModel } from './embeddings.ts'
import type { EstimateSample } from './loadSamples.ts'

/** Path to the committed embeddings cache, relative to the repo root. */
export const CACHE_PATH = '.github/instructions/estimate/embeddings.json'

/** One cached sample vector plus the content hash it was computed from. */
export interface CacheEntry {
  hash: string
  embedding: number[]
}

/** The on-disk cache: the model that produced the vectors, keyed by sample filename. */
export interface EmbeddingCache {
  model: string
  entries: Record<string, CacheEntry>
}

/** A sample paired with its cached embedding, or undefined when the cache missed or went stale. */
export interface MaybeEmbeddedSample {
  sample: EstimateSample
  embedding?: number[]
}

/**
 * Canonical text used to embed a sample or a target issue. Both share the {title, body, labels}
 * shape, so one function keeps the sample vectors and the query vector in the same representation —
 * a prerequisite for meaningful cosine ranking.
 */
export const embeddingText = (input: IssueInput): string =>
  `Title: ${input.title}\nLabels: ${input.labels.join(', ')}\nBody:\n${input.body}`

/** Stable content hash of an embedding text, used to detect when a cached vector is stale. */
export const contentHash = (text: string): string => crypto.createHash('sha256').update(text).digest('hex')

/** Reads the embeddings cache from disk, returning an empty cache when the file is absent or invalid. */
export const loadEmbeddingCache = (repoRoot: string): EmbeddingCache => {
  const filePath = path.join(repoRoot, CACHE_PATH)
  if (!fs.existsSync(filePath)) return { model: embeddingModel(), entries: {} }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<EmbeddingCache>
    return { model: parsed.model ?? embeddingModel(), entries: parsed.entries ?? {} }
  } catch {
    // A corrupt cache must not crash estimation; treat it as empty and let entries re-embed.
    return { model: embeddingModel(), entries: {} }
  }
}

/** Writes the embeddings cache to disk with stable key ordering and a trailing newline. */
export const saveEmbeddingCache = (repoRoot: string, cache: EmbeddingCache): void => {
  const filePath = path.join(repoRoot, CACHE_PATH)
  const ordered: EmbeddingCache = {
    model: cache.model,
    entries: Object.fromEntries(
      Object.keys(cache.entries)
        .sort()
        .map(key => [key, cache.entries[key]]),
    ),
  }
  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2) + '\n')
}

/**
 * Joins samples with their cached embeddings. A cached vector is used only when its filename matches
 * a sample, the cache was produced by the current embedding model, and the sample's content hash
 * still matches (so an edited sample re-embeds rather than ranking on a stale vector). Otherwise the
 * embedding is left undefined for the caller to fill on demand or skip.
 */
export const joinSamplesWithEmbeddings = (samples: EstimateSample[], cache: EmbeddingCache): MaybeEmbeddedSample[] => {
  const modelMatches = cache.model === embeddingModel()
  return samples.map(sample => {
    const entry = sample.file ? cache.entries[sample.file] : undefined
    const fresh = modelMatches && entry != null && entry.hash === contentHash(embeddingText(sample.input))
    return { sample, embedding: fresh ? entry!.embedding : undefined }
  })
}
