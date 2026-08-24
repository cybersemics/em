/**
 * Evaluation harness for the milestone categorizer. Runs the exact selection pipeline the workflow
 * uses over every labeled sample and grades the outcome against the known-correct milestone.
 *
 * This is the ruler for the prompt: run it before and after editing
 * `scripts/milestone/instructions.md` to confirm the edit helped. Grading is
 * strict — the predicted milestone must equal the recorded one exactly — and the run exits non-zero
 * below `MILESTONE_MIN_ACCURACY`, so a prompt change that regresses accuracy fails rather than
 * printing a slightly worse number nobody compares.
 *
 * A sample the gate refuses to assign counts as a prediction of "no milestone", because that is what
 * production would do. Samples whose `expected` is null are the cases where asking a human is the
 * correct answer.
 *
 * Offline with respect to GitHub state: it reads the open milestones and calls the model, but never
 * writes to any issue. Run manually with `cd scripts/milestone && yarn evaluate`.
 */
import 'dotenv/config'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import { resolveGateThresholds } from './lib/gate.ts'
import GitHubClient, { type Milestone } from './lib/github.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples, { type MilestoneSample } from './lib/loadSamples.ts'
import type { Confidence } from './lib/parseSelection.ts'
import selectMilestone from './lib/selectMilestone.ts'

const DEFAULT_REPO = 'cybersemics/em'
// The measured baseline is 25/29 (86%). The floor sits below it rather than at it because the
// evaluation is stochastic — five samples are drawn per issue, so one sample flipping moves the
// score 3.4 points. At 0.8 a single flip still passes and two consecutive regressions fail, which
// catches a real prompt regression without failing on noise.
const DEFAULT_MIN_ACCURACY = 0.8

/** Label used in the report for the absence of a milestone, on either side of the comparison. */
const NONE = '«none»'

/** One graded prediction. */
export interface EvalRow {
  issue?: number
  expected: string | null
  /** What the workflow would have done: the assigned milestone, or null when it would have asked. */
  predicted: string | null
  /** The milestone the votes landed on, even when the gate withheld it. */
  guess: string | null
  assigned: boolean
  agreement: number
  confidence: Confidence
}

/** Aggregate metrics computed from a set of graded predictions. */
export interface EvalMetrics {
  total: number
  /** Predictions that matched `expected` exactly, including correctly declining to assign. */
  correct: { count: number; fraction: number }
  outcomes: {
    assignedCorrect: number
    assignedWrong: number
    /** Asked a human even though a milestone was recorded — a miss, but a safe one. */
    askedButFitted: number
    /** Asked a human where asking was the right answer. */
    askedCorrectly: number
    /** Asked a human even though the withheld guess was the recorded milestone — accuracy the gate cost. */
    withheldButCorrect: number
  }
  /** Of the milestones actually assigned, the fraction that were right. The cost of a silent mistake. */
  precision: { count: number; total: number; fraction: number }
  /** `confusion[expected][predicted]` = count. */
  confusion: Record<string, Record<string, number>>
  /** Accuracy grouped by a calibration key (agreement tier or confidence level). */
  calibration: Record<string, { total: number; correct: number }>
}

/** Buckets a 0–1 agreement score into a coarse calibration tier. */
const agreementTier = (agreement: number): string =>
  agreement >= 0.8 ? 'agreement≥0.8' : agreement >= 0.5 ? 'agreement 0.5–0.8' : 'agreement<0.5'

/** Computes accuracy, an outcome breakdown, a confusion matrix, and a calibration breakdown from graded rows. */
export const computeMetrics = (rows: EvalRow[]): EvalMetrics => {
  const total = rows.length
  const correctRows = rows.filter(row => row.predicted === row.expected)
  const assignedRows = rows.filter(row => row.assigned)

  const confusion: Record<string, Record<string, number>> = {}
  for (const row of rows) {
    const expected = row.expected ?? NONE
    const predicted = row.predicted ?? NONE
    confusion[expected] ??= {}
    confusion[expected][predicted] = (confusion[expected][predicted] ?? 0) + 1
  }

  const calibration: Record<string, { total: number; correct: number }> = {}
  /** Records one prediction against a calibration bucket. */
  const bump = (key: string, isCorrect: boolean) => {
    calibration[key] ??= { total: 0, correct: 0 }
    calibration[key].total += 1
    calibration[key].correct += isCorrect ? 1 : 0
  }
  for (const row of rows) {
    const isCorrect = row.predicted === row.expected
    bump(agreementTier(row.agreement), isCorrect)
    bump(`confidence:${row.confidence}`, isCorrect)
  }

  return {
    total,
    correct: { count: correctRows.length, fraction: total ? correctRows.length / total : 0 },
    outcomes: {
      assignedCorrect: assignedRows.filter(row => row.predicted === row.expected).length,
      assignedWrong: assignedRows.filter(row => row.predicted !== row.expected).length,
      askedButFitted: rows.filter(row => !row.assigned && row.expected !== null).length,
      askedCorrectly: rows.filter(row => !row.assigned && row.expected === null).length,
      withheldButCorrect: rows.filter(row => !row.assigned && row.guess !== null && row.guess === row.expected).length,
    },
    precision: {
      count: assignedRows.filter(row => row.predicted === row.expected).length,
      total: assignedRows.length,
      fraction: assignedRows.length
        ? assignedRows.filter(row => row.predicted === row.expected).length / assignedRows.length
        : 0,
    },
    confusion,
    calibration,
  }
}

/** Reads the accuracy floor from the environment. Throws on an unusable value. */
export const resolveMinAccuracy = (env: Record<string, string | undefined> = process.env): number => {
  const raw = env.MILESTONE_MIN_ACCURACY
  const minAccuracy = raw != null ? Number(raw) : DEFAULT_MIN_ACCURACY
  if (!Number.isFinite(minAccuracy) || minAccuracy < 0 || minAccuracy > 1) {
    throw new Error(`MILESTONE_MIN_ACCURACY must be a number between 0 and 1, got "${raw}"`)
  }
  return minAccuracy
}

/** Formats a 0–1 fraction as a whole-number percentage. */
const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`

/** Renders the metrics summary as human-readable text. */
export const formatReport = (metrics: EvalMetrics): string => {
  const lines: string[] = []
  lines.push('')
  lines.push('=== Milestone categorizer evaluation ===')
  lines.push(`Samples: ${metrics.total}`)
  lines.push(`Accuracy: ${metrics.correct.count}/${metrics.total} (${percent(metrics.correct.fraction)})`)
  lines.push(
    `Precision when assigning: ${metrics.precision.count}/${metrics.precision.total} (${percent(metrics.precision.fraction)})`,
  )

  lines.push('')
  lines.push('Outcomes:')
  lines.push(`  assigned, correct : ${metrics.outcomes.assignedCorrect}`)
  lines.push(`  assigned, wrong   : ${metrics.outcomes.assignedWrong}`)
  lines.push(`  asked, but fitted : ${metrics.outcomes.askedButFitted}`)
  lines.push(`  asked, correctly  : ${metrics.outcomes.askedCorrectly}`)
  // What relaxing MILESTONE_MIN_CONFIDENCE or MILESTONE_MIN_AGREEMENT would buy: these are the
  // issues the model placed correctly and the gate withheld anyway.
  lines.push(`  withheld a correct guess: ${metrics.outcomes.withheldButCorrect}`)

  lines.push('')
  lines.push('Confusion (expected → predicted), mismatches only:')
  const mismatches = Object.entries(metrics.confusion).flatMap(([expected, row]) =>
    Object.entries(row)
      .filter(([predicted]) => predicted !== expected)
      .map(([predicted, count]) => `  ${expected} → ${predicted}${count > 1 ? ` ×${count}` : ''}`),
  )
  lines.push(...(mismatches.length > 0 ? mismatches : ['  (none)']))

  lines.push('')
  lines.push('Calibration (accuracy by group):')
  for (const [key, { total, correct }] of Object.entries(metrics.calibration)) {
    lines.push(`  ${key.padEnd(18)}: ${correct}/${total} (${percent(total ? correct / total : 0)})`)
  }

  return lines.join('\n')
}

/** Runs the selection pipeline over every sample and returns the graded rows. */
const grade = async (
  samples: MilestoneSample[],
  milestones: Milestone[],
  instructions: string,
  openaiApiKey: string,
): Promise<EvalRow[]> => {
  const thresholds = resolveGateThresholds()
  const rows: EvalRow[] = []
  for (const sample of samples) {
    const selection = await selectMilestone({
      issue: sample.input,
      milestones,
      instructions,
      openaiApiKey,
      thresholds,
    })
    const predicted = selection.assign ? selection.milestone : null
    rows.push({
      issue: sample.source?.issue,
      expected: sample.expected,
      predicted,
      guess: selection.milestone,
      assigned: selection.assign,
      agreement: selection.agreement,
      confidence: selection.confidence,
    })
    const signals = `${Math.round(selection.agreement * 100)}%/${selection.confidence}`
    const outcome = selection.assign
      ? `assigned ${selection.milestone} [${signals}]`
      : `asked (${selection.reasons.join('; ')}; guess ${selection.milestone ?? NONE}) [${signals}]`
    console.info(
      `  ${sample.source?.issue ? `#${sample.source.issue}` : sample.input.title.slice(0, 40)}: expected ${sample.expected ?? NONE}, ${outcome} ${predicted === sample.expected ? '✓' : '✗'}`,
    )
  }
  return rows
}

/** Evaluates the categorizer over every labeled sample and prints the accuracy report. */
const main = async () => {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  const minAccuracy = resolveMinAccuracy()
  const repo = process.env.GITHUB_REPOSITORY ?? process.env.MILESTONE_REPO ?? DEFAULT_REPO

  const instructions = loadInstructions()
  const samples = loadSamples()
  if (samples.length === 0) throw new Error('No samples found to evaluate.')

  // Reading milestones from a public repository needs no token, so the evaluation runs locally with
  // nothing but an OpenAI key.
  const milestones = await new GitHubClient({ repo, token: process.env.GITHUB_TOKEN }).listOpenMilestones()
  if (milestones.length === 0) throw new Error(`No open milestones found in ${repo}.`)

  console.info(`Evaluating ${samples.length} samples against ${milestones.length} open milestones...`)
  const rows = await grade(samples, milestones, instructions, openaiApiKey)

  // Each row carries the agreement and confidence behind its verdict, so alternative gate
  // thresholds can be scored offline against a run that already happened. Without this, answering
  // "what would requiring unanimity cost?" means paying for the whole evaluation again.
  const jsonPath = process.env.MILESTONE_EVAL_JSON
  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2) + '\n')
    console.info(`Wrote ${rows.length} graded rows to ${jsonPath}`)
  }

  const metrics = computeMetrics(rows)
  console.info(formatReport(metrics))

  if (metrics.correct.fraction < minAccuracy) {
    throw new Error(
      `Accuracy ${percent(metrics.correct.fraction)} is below the required ${percent(minAccuracy)} (MILESTONE_MIN_ACCURACY).`,
    )
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
