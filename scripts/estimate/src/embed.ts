/**
 * Regenerates the committed sample embeddings cache used for kNN retrieval.
 *
 * For each sample it computes a content hash; a sample is re-embedded only when its hash changed,
 * the cache was produced by a different embedding model, or `--force` is passed. Unchanged samples
 * keep their existing vectors, so a routine run embeds nothing and the cache is stable. Vectors are
 * rounded to keep the committed JSON compact; the precision loss is negligible for cosine ranking.
 *
 * Run manually (needs OPENAI_API_KEY): cd scripts/estimate && yarn embed [--force]
 */
import 'dotenv/config'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {
  type EmbeddingCache,
  contentHash,
  embeddingText,
  loadEmbeddingCache,
  saveEmbeddingCache,
} from './lib/embeddingCache.ts'
import { embedTexts, embeddingModel } from './lib/embeddings.ts'
import loadSamples from './lib/loadSamples.ts'

/** Decimal places retained per embedding component; enough for stable ranking, small on disk. */
const PRECISION = 6

/** Rounds an embedding vector to PRECISION decimals to keep the committed cache compact. */
const round = (embedding: number[]): number[] => embedding.map(value => Number(value.toFixed(PRECISION)))

const main = async () => {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  const force = process.argv.slice(2).includes('--force')

  const repoRoot =
    process.env.GITHUB_WORKSPACE ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

  const model = embeddingModel()
  const samples = loadSamples(repoRoot)
  if (samples.length === 0) throw new Error('No samples found to embed.')

  const existing = loadEmbeddingCache(repoRoot)
  // A model change invalidates every cached vector, since embeddings are not comparable across models.
  const modelMatches = existing.model === model

  // Decide which samples need (re)embedding and which can reuse an existing vector.
  const entries: EmbeddingCache['entries'] = {}
  const toEmbed: { file: string; text: string; hash: string }[] = []
  for (const sample of samples) {
    if (!sample.file) continue
    const text = embeddingText(sample.input)
    const hash = contentHash(text)
    const cached = existing.entries[sample.file]
    const reuse = !force && modelMatches && cached != null && cached.hash === hash
    if (reuse) {
      entries[sample.file] = cached
    } else {
      toEmbed.push({ file: sample.file, text, hash })
    }
  }

  console.info(
    `Embedding cache: ${samples.length} samples, ${samples.length - toEmbed.length} reused, ${toEmbed.length} to (re)embed with ${model}${force ? ' (--force)' : ''}.`,
  )

  if (toEmbed.length > 0) {
    const vectors = await embedTexts(
      openaiApiKey,
      toEmbed.map(item => item.text),
    )
    toEmbed.forEach((item, index) => {
      entries[item.file] = { hash: item.hash, embedding: round(vectors[index] ?? []) }
    })
  }

  saveEmbeddingCache(repoRoot, { model, entries })
  console.info(`Wrote embeddings cache with ${Object.keys(entries).length} entries.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
