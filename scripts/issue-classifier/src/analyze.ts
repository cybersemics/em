/**
 * Paired analysis of a `compare.ts` run: does model B beat model A on the same issues?
 *
 * The headline question a pair of accuracy percentages cannot answer is whether a model that scores
 * higher got there by fixing the other's mistakes or by trading them for different ones. Two arms at
 * 74% and 78% are consistent with "fixed six, broke four" and with "fixed two, broke nothing", and
 * only the first of those is noise. So every figure here is computed per issue and then paired:
 * accuracy is reported for orientation, and the decision rests on the discordant pairs.
 *
 * Reported, in order of what should drive a deployment decision:
 *
 * - The flip table — how many issues each model got right that the other got wrong, and which ones.
 * This is the whole comparison; everything else contextualises it.
 * - McNemar's exact test on those discordant pairs. Concordant pairs carry no information about
 * which model is better, so they are excluded rather than diluting the test — which is exactly why a
 * paired test finds differences an unpaired comparison of percentages cannot.
 * - A paired bootstrap interval on the accuracy difference, resampling issues rather than
 * predictions, since the issues are the independent unit.
 * - Stability — how often each model gives the same answer across repetitions. A model whose own
 * answer changes run to run cannot be separated from its rival by a single run of each, and this
 * says how much of any observed gap could be that.
 * - Cost, from the token counts the run recorded, extrapolated to a realistic issue volume.
 *
 * ```sh
 * node scripts/issue-classifier/src/analyze.ts --in results.jsonl --baseline gpt-5.6-terra
 * ```
 */
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import type { CompareRow } from './compare.ts'

/**
 * Per-million-token prices, from OpenAI's published API pricing for the short-context tier, which is
 * the tier every request here falls in — the prompt runs about 4.5k tokens against a context limit
 * orders of magnitude larger.
 *
 * Cached input is priced separately because it is most of the prompt: the instructions are byte
 * identical on every call, so the cache hit rate is high and pricing the whole prompt at the
 * uncached rate would overstate both models by roughly the same large factor — and the ratio between
 * them is the number this analysis exists to produce.
 */
const PRICES: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-5.6-terra': { input: 2.0, cachedInput: 0.2, output: 12.0 },
  'gpt-5.6-sol': { input: 4.0, cachedInput: 0.4, output: 20.0 },
  'gpt-5.6-luna': { input: 0.2, cachedInput: 0.02, output: 1.2 },
}

/** Issues to extrapolate the cost difference over, matching the repository's unmilestoned backlog. */
const PROJECTION_ISSUES = 1000

/** Bootstrap resamples used for the paired confidence interval. */
const BOOTSTRAP_RESAMPLES = 20000

/** Label used in the report for the absence of a milestone. */
const NONE = '«none»'

/** One model's consolidated verdict on one issue, across every repetition. */
export interface Consensus {
  issue: number
  expected: string | null
  /** The modal answer across repetitions — what the model says when its own noise is averaged out. */
  guess: string | null
  correct: boolean
  /** Repetitions in which this model was right, out of `runs`. */
  correctRuns: number
  runs: number
  /** Whether every repetition gave the same answer. */
  stable: boolean
}

/**
 * Reduces a model's repetitions on one issue to a single verdict.
 *
 * The modal answer is used rather than the first run's, because a single run of a five-vote pipeline
 * is itself a sample: pairing two single runs compares two draws, and part of any gap between them
 * is each model's own run-to-run variance rather than a difference between the models. Ties break
 * toward the earliest run so the result is deterministic.
 */
export const consolidate = (rows: CompareRow[]): Consensus => {
  const counts = new Map<string | null, number>()
  for (const row of rows) counts.set(row.guess, (counts.get(row.guess) ?? 0) + 1)
  const max = Math.max(...counts.values())
  const guess = rows.find(row => counts.get(row.guess) === max)!.guess
  return {
    issue: rows[0].issue,
    expected: rows[0].expected,
    guess,
    correct: guess === rows[0].expected,
    correctRuns: rows.filter(row => row.correct).length,
    runs: rows.length,
    stable: counts.size === 1,
  }
}

/**
 * Two-sided exact binomial probability of a split at least as lopsided as `b` versus `c` under the
 * null that a discordant pair is equally likely to fall either way.
 *
 * Exact rather than the chi-square approximation, which needs roughly 25 discordant pairs to be
 * trustworthy and will be consulted here at counts well below that. Computed by summing the tail
 * probability directly and doubling, clamped at 1.
 */
export const mcnemarExactP = (b: number, c: number): number => {
  const n = b + c
  if (n === 0) return 1
  // Iterative binomial coefficient, which stays exact for the counts this harness produces and never
  // overflows the way a factorial would.
  /** The binomial coefficient C(n, k). */
  const choose = (k: number): number =>
    Array.from({ length: k }, (_, i) => (n - i) / (i + 1)).reduce((product, term) => product * term, 1)
  const tail = Array.from({ length: Math.min(b, c) + 1 }, (_, k) => choose(k)).reduce((sum, term) => sum + term, 0)
  return Math.min(1, 2 * tail * Math.pow(0.5, n))
}

/** Wilson score interval for a proportion, which stays inside [0, 1] at the small counts here. */
export const wilson = (correct: number, total: number): [number, number] => {
  if (total === 0) return [0, 0]
  const z = 1.96
  const p = correct / total
  const denominator = 1 + (z * z) / total
  const centre = p + (z * z) / (2 * total)
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))
  return [(centre - spread) / denominator, (centre + spread) / denominator]
}

/** Deterministic 32-bit PRNG, so a reported interval can be reproduced exactly. */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Percentile interval for the difference in accuracy, bootstrapping over issues.
 *
 * Issues are resampled, not predictions, and each resampled issue carries both models' verdicts
 * together. That pairing is the point: the two arms saw identical issues, so the difference between
 * them is far better determined than either accuracy is on its own, and an unpaired interval would
 * throw that away and report a width dominated by which issues happened to be drawn.
 */
export const bootstrapDifference = (
  pairs: { a: boolean; b: boolean }[],
  resamples = BOOTSTRAP_RESAMPLES,
  seed = 1,
): [number, number] => {
  const random = mulberry32(seed)
  const differences = Array.from({ length: resamples }, () => {
    const drawn = Array.from({ length: pairs.length }, () => pairs[Math.floor(random() * pairs.length)])
    return drawn.filter(pair => pair.b).length / drawn.length - drawn.filter(pair => pair.a).length / drawn.length
  }).sort((x, y) => x - y)
  return [differences[Math.floor(0.025 * resamples)], differences[Math.floor(0.975 * resamples)]]
}

/** Formats a 0–1 fraction as a percentage with one decimal. */
const percent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`

/** Formats a signed percentage-point difference. */
const points = (difference: number): string => `${difference >= 0 ? '+' : ''}${(difference * 100).toFixed(1)}pp`

/** Total dollar cost of every row belonging to one model. */
export const costOf = (rows: CompareRow[]): number => {
  const price = PRICES[rows[0].model]
  if (!price) throw new Error(`No price recorded for ${rows[0].model}`)
  return rows.reduce(
    (total, row) =>
      total +
      ((row.usage.prompt - row.usage.cachedPrompt) * price.input +
        row.usage.cachedPrompt * price.cachedInput +
        row.usage.completion * price.output) /
        1e6,
    0,
  )
}

/** Renders the whole comparison report. */
export const report = (rows: CompareRow[], baseline: string): string => {
  const models = [...new Set(rows.map(row => row.model))].sort((a, b) => (a === baseline ? -1 : b === baseline ? 1 : 0))
  if (models.length !== 2) throw new Error(`Expected exactly two models, found ${models.join(', ')}`)
  const [a, b] = models
  const runs = [...new Set(rows.map(row => row.run))].sort()
  const issues = [...new Set(rows.map(row => row.issue))].sort((x, y) => x - y)
  const lines: string[] = []

  /** Every row for one model on one issue. */
  const rowsFor = (model: string, issue: number): CompareRow[] =>
    rows.filter(row => row.model === model && row.issue === issue)

  const consensus = new Map(
    models.map(model => [model, new Map(issues.map(issue => [issue, consolidate(rowsFor(model, issue))]))]),
  )

  lines.push(`=== ${a} vs ${b} ===`)
  lines.push(`${issues.length} issues × ${runs.length} run${runs.length === 1 ? '' : 's'}, paired on the same issues.`)

  lines.push('')
  lines.push('Per-run accuracy (each run is one independent pass over every issue):')
  lines.push(`  run   ${a.padEnd(18)} ${b.padEnd(18)} difference`)
  for (const run of runs) {
    /** One model's accuracy within this run. */
    const accuracy = (model: string): number => {
      const arm = rows.filter(row => row.model === model && row.run === run)
      return arm.filter(row => row.correct).length / arm.length
    }
    lines.push(
      `  ${String(run).padEnd(4)}  ${percent(accuracy(a)).padEnd(18)} ${percent(accuracy(b)).padEnd(18)} ${points(accuracy(b) - accuracy(a))}`,
    )
  }

  lines.push('')
  lines.push('Pooled over every run (each issue counted once per run):')
  for (const model of models) {
    const arm = rows.filter(row => row.model === model)
    const correct = arm.filter(row => row.correct).length
    const [low, high] = wilson(correct, arm.length)
    lines.push(
      `  ${model.padEnd(18)} ${correct}/${arm.length} = ${percent(correct / arm.length)}  (95% CI ${percent(low)}–${percent(high)}, unpaired)`,
    )
  }

  lines.push('')
  lines.push("Consensus per issue (modal answer across runs, which removes each model's own run-to-run noise):")
  for (const model of models) {
    const verdicts = issues.map(issue => consensus.get(model)!.get(issue)!)
    const correct = verdicts.filter(verdict => verdict.correct).length
    lines.push(`  ${model.padEnd(18)} ${correct}/${issues.length} = ${percent(correct / issues.length)}`)
  }

  // The flip table. This is the comparison; the percentages above only orient it.
  const flips = issues.map(issue => ({
    issue,
    expected: consensus.get(a)!.get(issue)!.expected,
    a: consensus.get(a)!.get(issue)!,
    b: consensus.get(b)!.get(issue)!,
  }))
  const fixes = flips.filter(flip => !flip.a.correct && flip.b.correct)
  const regressions = flips.filter(flip => flip.a.correct && !flip.b.correct)
  const bothRight = flips.filter(flip => flip.a.correct && flip.b.correct)
  const bothWrong = flips.filter(flip => !flip.a.correct && !flip.b.correct)

  lines.push('')
  lines.push(`Paired outcomes on consensus (${issues.length} issues):`)
  lines.push(`  both right                       : ${bothRight.length}`)
  lines.push(`  both wrong                       : ${bothWrong.length}`)
  lines.push(`  ${b} fixes ${a}`.padEnd(35) + `: ${fixes.length}`)
  lines.push(`  ${b} breaks ${a}`.padEnd(35) + `: ${regressions.length}`)

  const p = mcnemarExactP(regressions.length, fixes.length)
  lines.push('')
  lines.push(
    `McNemar exact (discordant only, n=${fixes.length + regressions.length}): ` +
      `${fixes.length} fixed vs ${regressions.length} broken, two-sided p = ${p.toFixed(4)}`,
  )
  const [low, high] = bootstrapDifference(
    issues.map(issue => ({ a: consensus.get(a)!.get(issue)!.correct, b: consensus.get(b)!.get(issue)!.correct })),
  )
  const observed =
    issues.filter(issue => consensus.get(b)!.get(issue)!.correct).length / issues.length -
    issues.filter(issue => consensus.get(a)!.get(issue)!.correct).length / issues.length
  lines.push(`Paired bootstrap on the difference: ${points(observed)} (95% CI ${points(low)} to ${points(high)})`)

  lines.push('')
  lines.push(`Issues ${b} fixed (${a} wrong → ${b} right):`)
  lines.push(
    ...(fixes.length
      ? fixes.map(
          flip =>
            `  #${flip.issue}  expected ${flip.expected ?? NONE}; ${a} said ${flip.a.guess ?? NONE} (${flip.a.correctRuns}/${flip.a.runs} runs right)`,
        )
      : ['  (none)']),
  )

  lines.push('')
  lines.push(`Issues ${b} broke (${a} right → ${b} wrong):`)
  lines.push(
    ...(regressions.length
      ? regressions.map(
          flip =>
            `  #${flip.issue}  expected ${flip.expected ?? NONE}; ${b} said ${flip.b.guess ?? NONE} (${flip.b.correctRuns}/${flip.b.runs} runs right)`,
        )
      : ['  (none)']),
  )

  // Whether the shared errors are the same error matters for what a switch buys: agreeing on a wrong
  // answer suggests the prompt or the taxonomy, while disagreeing suggests the issue is genuinely
  // ambiguous and neither model has traction on it.
  lines.push('')
  lines.push('Where both are wrong:')
  lines.push(`  same wrong answer      : ${bothWrong.filter(flip => flip.a.guess === flip.b.guess).length}`)
  lines.push(`  different wrong answers: ${bothWrong.filter(flip => flip.a.guess !== flip.b.guess).length}`)

  if (runs.length > 1) {
    lines.push('')
    lines.push('Per-run pairing, so the consensus figure above can be checked against single runs:')
    lines.push('  run   fixed  broken  net')
    for (const run of runs) {
      const perIssue = issues.map(issue => ({
        a: rows.find(row => row.model === a && row.run === run && row.issue === issue)!,
        b: rows.find(row => row.model === b && row.run === run && row.issue === issue)!,
      }))
      const fixed = perIssue.filter(pair => !pair.a.correct && pair.b.correct).length
      const broken = perIssue.filter(pair => pair.a.correct && !pair.b.correct).length
      lines.push(
        `  ${String(run).padEnd(4)}  ${String(fixed).padStart(5)}  ${String(broken).padStart(6)}  ${points((fixed - broken) / issues.length)}`,
      )
    }

    lines.push('')
    lines.push('Stability (issues where every run gave the same answer):')
    for (const model of models) {
      const stable = issues.filter(issue => consensus.get(model)!.get(issue)!.stable).length
      lines.push(`  ${model.padEnd(18)} ${stable}/${issues.length} = ${percent(stable / issues.length)}`)
    }
  }

  lines.push('')
  lines.push('Cost, from the token counts this run recorded:')
  lines.push(`  model               $/issue   prompt  cached  output   projected per ${PROJECTION_ISSUES} issues`)
  const perIssueCost = new Map<string, number>()
  for (const model of models) {
    const arm = rows.filter(row => row.model === model)
    const cost = costOf(arm) / arm.length
    perIssueCost.set(model, cost)
    /** Mean tokens per issue for one usage field. */
    const mean = (field: 'prompt' | 'cachedPrompt' | 'completion'): number =>
      arm.reduce((total, row) => total + row.usage[field], 0) / arm.length
    lines.push(
      `  ${model.padEnd(18)} $${cost.toFixed(4)}   ${mean('prompt').toFixed(0).padStart(6)}  ${mean('cachedPrompt').toFixed(0).padStart(6)}  ${mean('completion').toFixed(0).padStart(6)}   $${(cost * PROJECTION_ISSUES).toFixed(2)}`,
    )
  }
  const extra = (perIssueCost.get(b)! - perIssueCost.get(a)!) * PROJECTION_ISSUES
  lines.push(
    `  Switching to ${b} costs $${extra.toFixed(2)} more per ${PROJECTION_ISSUES} issues ` +
      `(${(perIssueCost.get(b)! / perIssueCost.get(a)!).toFixed(2)}×).`,
  )

  return lines.join('\n')
}

/** Reads a comparison run and prints the paired report. */
const main = () => {
  const argv = process.argv.slice(2)
  /** Reads the argument following a flag. */
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const input = value('--in')
  const baseline = value('--baseline') ?? 'gpt-5.6-terra'
  if (!input) throw new Error('--in is required')

  const rows = fs
    .readFileSync(input, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as CompareRow)

  console.info(report(rows, baseline))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  }
}

export default main
