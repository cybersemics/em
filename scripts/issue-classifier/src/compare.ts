/**
 * Paired A/B harness for comparing two models on the same issues, under the same frozen prompt.
 *
 * `yarn evaluate` answers "how accurate is this?"; this answers "is model B better than model A?",
 * which is a different question and is not settled by running the first one twice and subtracting.
 * Two aggregate percentages a few points apart can come from a model that fixed nine errors and
 * broke seven, or from one that fixed two and broke none. Only a per-issue pairing distinguishes
 * them, and the second is worth deploying while the first is mostly noise.
 *
 * Everything downstream of the model is the production path: the prompt comes from
 * `buildPrompt`, the votes are tallied by `tallyVotes`, and the retry policy is the one in
 * `selectMilestone`, which is called with its `infer` seam pointed at a model-parameterised
 * request. The only thing that differs between the two arms is the `model` field.
 *
 * Three things are held fixed across every arm and every repetition, because each of them would
 * otherwise leak into the difference being measured:
 *
 * - The open milestones, fetched once. A milestone created mid-run would change the prompt for
 * whichever arm happened to run after it.
 * - The issue set, from one directory of samples.
 * - The order within a pair, alternated by repetition, so that if the API drifts over the minutes a
 * run takes, it drifts across both arms rather than into one of them.
 *
 * Repetitions matter more here than they do for a single accuracy figure. With `n=5` votes per
 * issue the pipeline is stochastic, and a one-run difference between two models is partly just two
 * draws from two noisy processes; running each arm several times separates the gap that persists
 * from the gap that resampled away.
 *
 * ```sh
 * node scripts/issue-classifier/src/compare.ts --models gpt-5.6-terra,gpt-5.6-sol --runs 3 --samples samples.jsonl
 * ```
 *
 * Writes one JSON line per (repetition, model, issue) to `--out`, carrying the graded outcome, the
 * vote spread, and the token usage behind it, so the analysis and the costing both run offline
 * against a run that already happened.
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import GitHubClient, { type Milestone } from './lib/github.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples, { type Sample } from './lib/loadSamples.ts'
import type { Confidence } from './lib/parseSelection.ts'
import selectMilestone from './lib/selectMilestone.ts'

const DEFAULT_REPO = 'cybersemics/em'

/**
 * Issues in flight at once.
 *
 * Each issue is independent — one prompt, one request, one tally — so concurrency changes only how
 * long the run takes, never what it decides. Held low anyway: the two arms of a pair are compared
 * against each other, and a rate limit that starts throttling halfway through a run would land on
 * whichever arm was unlucky.
 */
const CONCURRENCY = 4

/**
 * Base delay between inference attempts, multiplied by the attempt number.
 *
 * Longer than production's, deliberately. The workflow retries inside a job a human may be waiting
 * on; this runs unattended for over an hour, and a network interruption lasting a few seconds is a
 * near certainty across a thousand requests. At production's one-second base all three attempts are
 * spent within three seconds, which is short enough that a single blip took out four concurrent
 * workers at once and cost a whole run.
 */
const RETRY_DELAY_MS = 5000

/** Token counts for one request, as reported by the API. */
export interface Usage {
  prompt: number
  /** Cached prompt tokens, billed at a discount. Reported so the costing can price them separately. */
  cachedPrompt: number
  completion: number
  /** Reasoning tokens, a subset of completion tokens. Broken out because they dominate the bill here. */
  reasoning: number
}

/** One model's graded verdict on one issue, in one repetition. */
export interface CompareRow {
  run: number
  model: string
  issue: number
  expected: string | null
  /** The milestone the votes named, which is also what production would assign. */
  guess: string | null
  correct: boolean
  agreement: number
  validVotes: number
  tied: boolean
  confidence: Confidence
  usage: Usage
  latencyMs: number
}

/** Command-line options for a comparison. */
export interface CompareOptions {
  models: string[]
  runs: number
  /** JSONL file of samples to evaluate, relative to the workspace root. */
  samples: string
  /** Which split to take from that file, or `all`. */
  split: 'train' | 'test' | 'all'
  out: string
  votes: number
}

/** Parses the command line. */
export const parseArgs = (argv: string[]): CompareOptions => {
  /** Reads the argument following a flag. */
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }

  const models = (value('--models') ?? '').split(',').filter(Boolean)
  const runs = Number(value('--runs') ?? 1)
  const samples = value('--samples') ?? 'samples.jsonl'
  const split = (value('--split') ?? 'all') as CompareOptions['split']
  const out = value('--out')
  const votes = Number(value('--votes') ?? 5)

  if (models.length < 2) throw new Error('--models needs at least two comma-separated model ids')
  if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs must be a positive integer, got "${runs}"`)
  if (!['train', 'test', 'all'].includes(split)) throw new Error(`--split must be train, test, or all, got "${split}"`)
  if (!out) throw new Error('--out is required')

  return { models, runs, samples, split, out, votes }
}

/**
 * Calls the Chat Completions API for one model, returning every sample's raw content alongside the
 * usage the request reported.
 *
 * Deliberately a copy of `inference.ts` rather than a call into it: that module reads its model from
 * the environment at import time, which is the right shape for a workflow that runs one model and
 * the wrong shape for a harness that has to alternate between two inside a single process. The
 * request body is otherwise identical field for field, and a divergence would silently make the
 * comparison measure something production does not do.
 */
export const inferWithModel = async ({
  apiKey,
  prompt,
  instructions,
  model,
  votes,
}: {
  apiKey: string
  prompt: string
  instructions: string
  model: string
  votes: number
}): Promise<{ outputs: string[]; usage: Usage }> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      n: votes,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      prompt_tokens_details?: { cached_tokens?: number }
      completion_tokens_details?: { reasoning_tokens?: number }
    }
  }

  return {
    outputs: (data.choices ?? []).map(choice => choice.message?.content ?? ''),
    usage: {
      prompt: data.usage?.prompt_tokens ?? 0,
      cachedPrompt: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      completion: data.usage?.completion_tokens ?? 0,
      reasoning: data.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    },
  }
}

/**
 * Runs one model over one issue through the production selection path and grades the result.
 *
 * Usage accumulates across attempts rather than being read off the last one, so a retried issue
 * reports what it actually cost instead of what its final attempt cost.
 */
export const gradeOne = async ({
  sample,
  milestones,
  instructions,
  apiKey,
  model,
  votes,
  run,
}: {
  sample: Sample
  milestones: Milestone[]
  instructions: string
  apiKey: string
  model: string
  votes: number
  run: number
}): Promise<CompareRow> => {
  const usage: Usage = { prompt: 0, cachedPrompt: 0, completion: 0, reasoning: 0 }
  const started = Date.now()

  const selection = await selectMilestone({
    issue: sample.input,
    milestones,
    instructions,
    openaiApiKey: apiKey,
    retryDelayMs: RETRY_DELAY_MS,
    infer: async ({ apiKey, prompt, instructions }) => {
      const result = await inferWithModel({ apiKey, prompt, instructions, model, votes })
      usage.prompt += result.usage.prompt
      usage.cachedPrompt += result.usage.cachedPrompt
      usage.completion += result.usage.completion
      usage.reasoning += result.usage.reasoning
      return result.outputs
    },
  })

  return {
    run,
    model,
    issue: sample.source!.issue,
    expected: sample.expected,
    guess: selection.milestone,
    correct: selection.milestone === sample.expected,
    agreement: selection.agreement,
    validVotes: selection.validVotes,
    tied: selection.tied,
    confidence: selection.confidence,
    usage,
    latencyMs: Date.now() - started,
  }
}

/**
 * Maps over `items` with at most `limit` in flight, preserving input order in the result.
 *
 * A rejection anywhere rejects the whole map, which is the behaviour this harness wants: a sample
 * that failed in one arm but not the other would leave the pairing incomplete, and a paired
 * comparison quietly computed over an unequal set is worse than one that stopped.
 */
export const mapConcurrent = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length)
  let next = 0
  /** Pulls the next unclaimed index until none is left. */
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** Runs every model over every sample, `runs` times, and appends the graded rows to the output file. */
const main = async () => {
  const { models, runs, samples: samplesFile, split, out, votes } = parseArgs(process.argv.slice(2))
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is required')

  const repo = process.env.GITHUB_REPOSITORY ?? process.env.ISSUE_CLASSIFIER_REPO ?? DEFAULT_REPO
  const instructions = loadInstructions()
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', samplesFile)
  const samples = loadSamples(file).filter(sample => split === 'all' || sample.split === split)
  if (samples.length === 0) throw new Error(`No ${split} samples found in ${samplesFile}.`)

  // Fetched once and shared by every arm: a milestone created mid-run would otherwise change the
  // prompt for whichever model happened to run after it.
  const milestones = await new GitHubClient({ repo, token: process.env.GITHUB_TOKEN }).listOpenMilestones()
  if (milestones.length === 0) throw new Error(`No open milestones found in ${repo}.`)

  console.info(
    `Comparing ${models.join(' vs ')} over ${samples.length} ${split} samples from ${samplesFile}, ` +
      `${runs} run${runs === 1 ? '' : 's'}, ${votes} votes, against ${milestones.length} open milestones.`,
  )

  const stream = fs.createWriteStream(path.resolve(out), { flags: 'a' })
  const started = Date.now()
  const dropped: { run: number; issue: number; message: string }[] = []

  for (const run of Array.from({ length: runs }, (_, i) => i + 1)) {
    // Alternate which arm goes first. If the API drifts over the minutes a run takes, the drift then
    // falls across both models rather than systematically into the one that always ran second.
    const order = run % 2 === 1 ? models : [...models].reverse()
    const rows = await mapConcurrent(samples, CONCURRENCY, async sample => {
      const issue = sample.source!.issue
      // A failure drops this issue from *both* arms for this run, and nothing else. Dropping the pair
      // keeps the comparison paired, which aborting also did — but aborting threw away every issue
      // already graded in the run, and across an hour of unattended requests a transient fault is not
      // the unlikely case. Recorded rather than passed over: a run that quietly graded fewer issues
      // than it was given would overstate its own coverage.
      const paired: CompareRow[] = []
      try {
        for (const model of order) {
          paired.push(await gradeOne({ sample, milestones, instructions, apiKey, model, votes, run }))
        }
      } catch (error) {
        dropped.push({ run, issue, message: (error as Error).message })
        console.warn(`  run ${run} #${issue}: DROPPED — ${(error as Error).message}`)
        return []
      }

      // Written here rather than after the run, so a fault late in a run cannot discard the hour of
      // grading that preceded it.
      for (const row of paired) stream.write(JSON.stringify(row) + '\n')
      const verdicts = paired
        .map(row => `${row.model.replace(/^gpt-[\d.]+-/, '')} ${row.correct ? '✓' : `✗ ${row.guess ?? '«none»'}`}`)
        .join('  |  ')
      console.info(`  run ${run} #${issue}: ${verdicts}`)
      return paired
    })

    for (const model of models) {
      const arm = rows.flat().filter(row => row.model === model)
      const correct = arm.filter(row => row.correct).length
      console.info(`run ${run} ${model}: ${correct}/${arm.length} (${Math.round((100 * correct) / arm.length)}%)`)
    }
  }

  stream.end()
  const written = (runs * samples.length - dropped.length) * models.length
  console.info(`\nWrote ${written} rows to ${out} in ${Math.round((Date.now() - started) / 1000)}s`)
  if (dropped.length > 0) {
    console.warn(`\n${dropped.length} issue-run pairs were dropped and are absent from every figure:`)
    for (const failure of dropped) console.warn(`  run ${failure.run} #${failure.issue}: ${failure.message}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
