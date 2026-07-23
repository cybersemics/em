/**
 * Leave-one-out evaluation harness for the estimator. For each labeled sample, rebuilds the prompt
 * from every OTHER sample, runs the full inference + voting pipeline on the held-out issue, and
 * compares the predicted category to the known-correct `expected`. Reports exact-bucket accuracy,
 * ±1-bucket accuracy, a confusion matrix, and a calibration breakdown (accuracy by vote agreement
 * and by self-reported confidence).
 *
 * This is the "ruler" for the estimator: run it before and after a prompt/model/voting change to
 * confirm the change actually helps. Offline — it makes model calls but never writes to Everhour.
 *
 * Run manually (needs OPENAI_API_KEY): cd scripts/estimate && yarn evaluate
 */
import 'dotenv/config'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { ESTIMATE_CATEGORIES, type EstimateCategory } from './everhour/estimates.ts'
import buildPrompt from './lib/buildPrompt.ts'
import inference from './lib/inference.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples, { type EstimateSample } from './lib/loadSamples.ts'
import tallyVotes from './lib/tallyVotes.ts'

/** One graded prediction from the leave-one-out run. */
export interface EvalRow {
  issue?: number
  expected: EstimateCategory
  predicted: EstimateCategory
  agreement: number
  confidence: 'high' | 'medium' | 'low'
}

/** Aggregate metrics computed from a set of graded predictions. */
export interface EvalMetrics {
  total: number
  /** Count and fraction of predictions that hit the exact bucket. */
  exact: { count: number; fraction: number }
  /** Count and fraction of predictions within one bucket of the expected category. */
  within1: { count: number; fraction: number }
  /** confusion[expected][predicted] = count. */
  confusion: Record<string, Record<string, number>>
  /** Accuracy grouped by a calibration key (agreement tier or confidence level). */
  calibration: Record<string, { total: number; exact: number }>
}

/**
 * Ordinal distance between two categories on the XXS<XS<S<M<L<XL<XXL scale. 0 = exact match,
 * 1 = adjacent bucket, etc. Used to distinguish near-misses from wild misses.
 */
export const bucketDistance = (a: EstimateCategory, b: EstimateCategory): number =>
  Math.abs(ESTIMATE_CATEGORIES.indexOf(a) - ESTIMATE_CATEGORIES.indexOf(b))

/** Buckets a 0–1 agreement score into a coarse calibration tier. */
const agreementTier = (agreement: number): string =>
  agreement >= 0.8 ? 'agreement≥0.8' : agreement >= 0.5 ? 'agreement 0.5–0.8' : 'agreement<0.5'

/** Computes exact/±1 accuracy, a confusion matrix, and a calibration breakdown from graded rows. */
export const computeMetrics = (rows: EvalRow[]): EvalMetrics => {
  const total = rows.length
  const exactCount = rows.filter(r => r.predicted === r.expected).length
  const within1Count = rows.filter(r => bucketDistance(r.predicted, r.expected) <= 1).length

  const confusion: Record<string, Record<string, number>> = {}
  for (const r of rows) {
    confusion[r.expected] ??= {}
    confusion[r.expected][r.predicted] = (confusion[r.expected][r.predicted] ?? 0) + 1
  }

  const calibration: Record<string, { total: number; exact: number }> = {}
  const bump = (key: string, isExact: boolean) => {
    calibration[key] ??= { total: 0, exact: 0 }
    calibration[key].total += 1
    calibration[key].exact += isExact ? 1 : 0
  }
  for (const r of rows) {
    const isExact = r.predicted === r.expected
    bump(agreementTier(r.agreement), isExact)
    bump(`confidence:${r.confidence}`, isExact)
  }

  return {
    total,
    exact: { count: exactCount, fraction: total ? exactCount / total : 0 },
    within1: { count: within1Count, fraction: total ? within1Count / total : 0 },
    confusion,
    calibration,
  }
}

/** Runs leave-one-out inference over all samples and returns the graded rows. */
const runLeaveOneOut = async (
  samples: EstimateSample[],
  instructions: string,
  openaiApiKey: string,
): Promise<EvalRow[]> => {
  const rows: EvalRow[] = []
  for (let i = 0; i < samples.length; i++) {
    const target = samples[i]
    const others = samples.filter((_, j) => j !== i)
    const prompt = buildPrompt(others, target.input)
    const outputs = await inference({ apiKey: openaiApiKey, prompt, instructions })
    const vote = tallyVotes(outputs)
    rows.push({
      issue: target.source?.issue,
      expected: target.expected as EstimateCategory,
      predicted: vote.estimate,
      agreement: vote.agreement,
      confidence: vote.confidence,
    })
    console.info(
      `  ${target.source?.issue ? `#${target.source.issue}` : `sample ${i + 1}`}: expected ${target.expected}, predicted ${vote.estimate} (agreement ${Math.round(vote.agreement * 100)}%, confidence ${vote.confidence})`,
    )
  }
  return rows
}

/** Renders the metrics summary as human-readable text. */
const formatReport = (metrics: EvalMetrics): string => {
  const lines: string[] = []
  lines.push('')
  lines.push('=== Estimator leave-one-out evaluation ===')
  lines.push(`Samples: ${metrics.total}`)
  lines.push(
    `Exact-bucket accuracy: ${metrics.exact.count}/${metrics.total} (${Math.round(metrics.exact.fraction * 100)}%)`,
  )
  lines.push(
    `±1-bucket accuracy:    ${metrics.within1.count}/${metrics.total} (${Math.round(metrics.within1.fraction * 100)}%)`,
  )

  lines.push('')
  lines.push('Confusion (expected → predicted):')
  for (const expected of ESTIMATE_CATEGORIES) {
    const row = metrics.confusion[expected]
    if (!row) continue
    const cells = ESTIMATE_CATEGORIES.filter(p => row[p]).map(p => `${p}×${row[p]}`)
    lines.push(`  ${expected.padEnd(4)} → ${cells.join(', ')}`)
  }

  lines.push('')
  lines.push('Calibration (exact accuracy by group):')
  for (const [key, { total, exact }] of Object.entries(metrics.calibration)) {
    lines.push(`  ${key.padEnd(18)}: ${exact}/${total} (${Math.round((total ? exact / total : 0) * 100)}%)`)
  }

  return lines.join('\n')
}

const main = async () => {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  // Resolve the repo root from this file's location (scripts/estimate/src/evaluate.ts → repo root)
  // so instructions/samples load correctly regardless of the current working directory.
  const repoRoot =
    process.env.GITHUB_WORKSPACE ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

  const instructions = loadInstructions(repoRoot)
  const samples = loadSamples(repoRoot)
  if (samples.length === 0) throw new Error('No samples found to evaluate.')

  console.info(`Evaluating ${samples.length} samples (leave-one-out)...`)
  const rows = await runLeaveOneOut(samples, instructions, openaiApiKey)
  console.info(formatReport(computeMetrics(rows)))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
