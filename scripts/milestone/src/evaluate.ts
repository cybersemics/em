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
import GitHubClient, { type Milestone } from './lib/github.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples, { type MilestoneSample } from './lib/loadSamples.ts'
import { CONFIDENCE_LEVELS, type Confidence } from './lib/parseSelection.ts'
import selectMilestone from './lib/selectMilestone.ts'

const DEFAULT_REPO = 'cybersemics/em'

/**
 * Which half of the corpus to evaluate. Defaults to `train`, deliberately: the held-out half is only
 * meaningful while it stays unseen, and a default of `test` would consume it on every routine run
 * until it measured nothing but how many times it had been looked at.
 */
const SPLIT = process.env.MILESTONE_EVAL_SPLIT ?? 'train'
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
  /** Whether the vote tied, which withholds assignment independently of the thresholds. */
  tied: boolean
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

/**
 * Whether a row's vote landed on the right milestone.
 *
 * Deliberately reads `guess`, not `predicted`. `predicted` is null wherever the gate withheld, so
 * scoring against it would bake the current thresholds into the measurement of those same
 * thresholds. `guess` is the milestone the votes actually named, which is what a confidence signal
 * is supposed to rank. Abstention falls out for free: a sample that fits no milestone and was
 * guessed as none counts as correct.
 */
export const isCorrect = (row: EvalRow): boolean => row.guess === row.expected

/** Extracts the confidence score a signal assigns to a row. */
export type Signal = (row: EvalRow) => number

/** One candidate gate setting: the accuracy and coverage that thresholding here would deliver. */
export interface CurvePoint {
  /** A distinct value the score takes. */
  threshold: number
  /** Rows scoring at or above the threshold. */
  answered: number
  coverage: number
  correct: number
  accuracy: number
}

/**
 * Area under the ROC curve: the probability that a randomly chosen correct prediction outranks a
 * randomly chosen wrong one. 0.5 means the signal carries no information at all; 1 is perfect
 * separation. Returns null when every row is correct or every row is wrong, where it is undefined.
 *
 * Ties count half. That term is not cosmetic — without it a constant signal scores 0 rather than
 * 0.5, which reads as a perfectly inverted signal instead of an inert one.
 */
export const auroc = (rows: EvalRow[], score: Signal): number | null => {
  const pos = rows.filter(isCorrect)
  const neg = rows.filter(row => !isCorrect(row))
  if (pos.length === 0 || neg.length === 0) return null

  let wins = 0
  for (const p of pos) {
    for (const n of neg) {
      wins += score(p) > score(n) ? 1 : score(p) === score(n) ? 0.5 : 0
    }
  }
  return wins / (pos.length * neg.length)
}

/**
 * The accuracy-rejection curve, evaluated only at the distinct values the score actually takes.
 *
 * Evaluating at distinct values is what makes this tie-safe. These scores are heavily tied, and a
 * curve that sliced inside a tied block would be reporting an arbitrary ordering as though it were
 * signal. Each point is a candidate gate setting, which makes this the artifact to act on.
 */
export const rejectionCurve = (rows: EvalRow[], score: Signal): CurvePoint[] =>
  [...new Set(rows.map(score))]
    .sort((a, b) => b - a)
    .map(threshold => {
      const answered = rows.filter(row => score(row) >= threshold)
      const correct = answered.filter(isCorrect).length
      return {
        threshold,
        answered: answered.length,
        coverage: answered.length / rows.length,
        correct,
        accuracy: answered.length ? correct / answered.length : 0,
      }
    })

/**
 * Mean accuracy across every coverage level — one scalar for ranking signals against each other.
 *
 * Ties break by issue number purely so the result is reproducible; within a tied block the ordering
 * is still arbitrary, which is why the rejection curve is what you act on and this is only for
 * comparison.
 */
export const auarc = (rows: EvalRow[], score: Signal): number => {
  if (rows.length === 0) return 0
  const ordered = [...rows].sort((a, b) => score(b) - score(a) || (a.issue ?? 0) - (b.issue ?? 0))
  let correct = 0
  let total = 0
  ordered.forEach((row, i) => {
    if (isCorrect(row)) correct += 1
    total += correct / (i + 1)
  })
  return total / ordered.length
}

/**
 * The candidate signals, scored side by side.
 *
 * `blend` averages the two independent families — the model's own claim and the spread of its votes
 * — since averaging agreement with unanimity would mostly restate agreement. `unanimity+agreement`
 * is reported too so the alternative reading of that comparison is visible rather than assumed.
 */
export const SIGNALS: { name: string; score: Signal }[] = [
  { name: 'verbalized', score: row => CONFIDENCE_LEVELS.indexOf(row.confidence) / (CONFIDENCE_LEVELS.length - 1) },
  { name: 'agreement', score: row => row.agreement },
  { name: 'unanimity', score: row => (row.agreement === 1 ? 1 : 0) },
  {
    name: 'blend',
    score: row => (CONFIDENCE_LEVELS.indexOf(row.confidence) / (CONFIDENCE_LEVELS.length - 1) + row.agreement) / 2,
  },
  { name: 'unanimity+agreement', score: row => ((row.agreement === 1 ? 1 : 0) + row.agreement) / 2 },
]

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

/** Formats an AUROC value, which is undefined when every row shares an outcome. */
const formatAuroc = (value: number | null): string => (value === null ? '—' : value.toFixed(2))

/**
 * Renders the signal-discrimination table, the rejection curve for the strongest signal, and the
 * decomposed decline rate.
 *
 * Base accuracy is printed beside the table on purpose: it is what makes a flat, useless signal
 * obvious at a glance, since a signal that cannot discriminate produces a curve that never rises
 * above it.
 */
export const formatSignalReport = (rows: EvalRow[]): string => {
  const lines: string[] = []
  const base = rows.length ? rows.filter(isCorrect).length / rows.length : 0

  lines.push('')
  lines.push(`Signal discrimination (${SPLIT}; AUROC 0.5 = no signal; base accuracy ${percent(base)}):`)
  lines.push('  signal                AUROC   AUARC')
  const scored = SIGNALS.map(signal => ({
    ...signal,
    auroc: auroc(rows, signal.score),
    auarc: auarc(rows, signal.score),
  }))
  for (const signal of scored) {
    lines.push(`  ${signal.name.padEnd(20)} ${formatAuroc(signal.auroc).padStart(5)}   ${signal.auarc.toFixed(2)}`)
  }

  // A tie withholds independently of the thresholds, so the signal is also scored without those rows.
  const tied = rows.filter(row => row.tied)
  if (tied.length > 0) {
    const untied = rows.filter(row => !row.tied)
    const best = [...scored].sort((a, b) => b.auarc - a.auarc)[0]
    lines.push(
      `  (excluding ${tied.length} tied row${tied.length === 1 ? '' : 's'}, ${best.name}: AUROC ${formatAuroc(auroc(untied, best.score))}, AUARC ${auarc(untied, best.score).toFixed(2)})`,
    )
  }

  const best = [...scored].sort((a, b) => b.auarc - a.auarc)[0]
  lines.push('')
  lines.push(`Accuracy-rejection curve for ${best.name}:`)
  lines.push('  threshold  answers  coverage  accuracy')
  for (const point of rejectionCurve(rows, best.score)) {
    lines.push(
      `  ${point.threshold.toFixed(2).padStart(9)}  ${String(point.answered).padStart(7)}  ${percent(point.coverage).padStart(8)}  ${percent(point.accuracy).padStart(8)}`,
    )
  }

  // A single blended decline rate would hide a prompt defect behind an intended feature: both
  // produce the same behaviour in production, but only one of them is a bug.
  const declined = rows.filter(row => row.guess === null)
  lines.push('')
  lines.push('Declines (the votes named no milestone):')
  lines.push(
    `  genuine no-fit    : ${declined.filter(row => row.expected === null).length}  (nothing fitted; the comment is the signal)`,
  )
  lines.push(
    `  spurious decline  : ${declined.filter(row => row.expected !== null).length}  (a milestone plainly fitted — prompt defect)`,
  )

  return lines.join('\n')
}

/** Renders the metrics summary as human-readable text. */
export const formatReport = (metrics: EvalMetrics): string => {
  const lines: string[] = []
  lines.push('')
  lines.push(`=== Milestone categorizer evaluation (${SPLIT}) ===`)
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
  // Kept as a regression signal now that nothing gates on confidence: this should stay at zero, and
  // a non-zero value means something is withholding a milestone the votes placed correctly.
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

/** A sample that could not be graded at all, because inference failed even after its retries. */
export interface EvalFailure {
  issue?: number
  message: string
}

/**
 * Runs the selection pipeline over every sample and returns the graded rows, plus any samples that
 * could not be graded.
 *
 * A sample that fails is recorded and skipped rather than aborting the run. Inference reaches over
 * the network dozens of times here, so a single transient fault is likely across a long evaluation,
 * and letting it discard every result already computed makes the harness unusable exactly when it is
 * doing the most work. Failures are counted and reported rather than passed over quietly — a run
 * that silently graded fewer samples than it was given would overstate its own coverage.
 */
export const grade = async (
  samples: MilestoneSample[],
  milestones: Milestone[],
  instructions: string,
  openaiApiKey: string,
  select: typeof selectMilestone = selectMilestone,
): Promise<{ rows: EvalRow[]; failures: EvalFailure[] }> => {
  const rows: EvalRow[] = []
  const failures: EvalFailure[] = []
  for (const sample of samples) {
    let selection
    try {
      selection = await select({ issue: sample.input, milestones, instructions, openaiApiKey })
    } catch (error) {
      failures.push({ issue: sample.source?.issue, message: (error as Error).message })
      console.warn(
        `  ${sample.source?.issue ? `#${sample.source.issue}` : sample.input.title.slice(0, 40)}: NOT GRADED`,
      )
      continue
    }
    const predicted = selection.milestone
    rows.push({
      issue: sample.source?.issue,
      expected: sample.expected,
      predicted,
      guess: selection.milestone,
      assigned: selection.milestone !== null,
      agreement: selection.agreement,
      tied: selection.tied,
      confidence: selection.confidence,
    })
    const signals = `${Math.round(selection.agreement * 100)}%/${selection.confidence}`
    const outcome =
      selection.milestone !== null
        ? `assigned ${selection.milestone} [${signals}]`
        : `asked — no milestone fitted [${signals}]`
    console.info(
      `  ${sample.source?.issue ? `#${sample.source.issue}` : sample.input.title.slice(0, 40)}: expected ${sample.expected ?? NONE}, ${outcome} ${predicted === sample.expected ? '✓' : '✗'}`,
    )
  }
  return { rows, failures }
}

/** Evaluates the categorizer over every labeled sample and prints the accuracy report. */
const main = async () => {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  const minAccuracy = resolveMinAccuracy()
  const repo = process.env.GITHUB_REPOSITORY ?? process.env.MILESTONE_REPO ?? DEFAULT_REPO

  if (!['train', 'test', 'all'].includes(SPLIT)) {
    throw new Error(`MILESTONE_EVAL_SPLIT must be train, test, or all, got "${SPLIT}"`)
  }

  const instructions = loadInstructions()
  const samples = loadSamples().filter(sample => SPLIT === 'all' || sample.split === SPLIT)
  if (samples.length === 0) throw new Error(`No ${SPLIT} samples found to evaluate.`)

  // Reading milestones from a public repository needs no token, so the evaluation runs locally with
  // nothing but an OpenAI key.
  const milestones = await new GitHubClient({ repo, token: process.env.GITHUB_TOKEN }).listOpenMilestones()
  if (milestones.length === 0) throw new Error(`No open milestones found in ${repo}.`)

  console.info(`Evaluating ${samples.length} ${SPLIT} samples against ${milestones.length} open milestones...`)
  const { rows, failures } = await grade(samples, milestones, instructions, openaiApiKey)
  if (failures.length > 0) {
    console.warn(`\n${failures.length} of ${samples.length} samples could not be graded and are excluded:`)
    for (const failure of failures) console.warn(`  #${failure.issue ?? '?'}: ${failure.message}`)
  }

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
  console.info(formatSignalReport(rows))
  if (failures.length > 0) console.info(`Ungraded: ${failures.length} (excluded from every figure above)`)

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
