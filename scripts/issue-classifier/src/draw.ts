/**
 * Draws a blind sample of labeled issues into a directory of sample files.
 *
 * "Blind" is a property of how the samples are handled, not of the file format: the issues are
 * selected, fetched, and written without anyone reading them, so a prompt cannot be tuned against
 * them and the accuracy they later report is a measurement rather than a memory of them. Nothing
 * here prints an issue title or body for exactly that reason — the run reports issue numbers,
 * milestone counts, and nothing else.
 *
 * The frame is every issue in the repository whose milestone is one a human assigned and which is
 * still open today, minus every issue any sample directory already holds. A closed milestone is excluded because
 * the classifier is only ever offered the open ones, so such an issue is unanswerable by
 * construction and would score as a guaranteed error that says nothing about the model.
 *
 * Selection is by seeded hash rather than by shuffling. Each candidate's rank is
 * `sha256(seed:number)`, so the same seed always draws the same issues, and an issue appearing in or
 * disappearing from the frame moves only itself rather than reshuffling every other draw.
 *
 * ```sh
 * node scripts/issue-classifier/src/draw.ts --count 150 --seed terra-sol-2026-08 --out samples-blind-2
 * ```
 */
import * as crypto from 'crypto'
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import GitHubClient, { type Issue } from './lib/github.ts'
import loadSamples from './lib/loadSamples.ts'

const DEFAULT_REPO = 'cybersemics/em'

/** Command-line options for a draw. */
export interface DrawOptions {
  count: number
  /** Seed string mixed into each candidate's rank hash, so a draw is reproducible by name. */
  seed: string
  /** Directory to write the sample files to, relative to the workspace root. */
  out: string
}

/**
 * Parses the command line.
 *
 * The seed is required and has no default on purpose: a draw whose seed was implicit cannot be
 * reproduced by anyone reading only its output.
 */
export const parseArgs = (argv: string[]): DrawOptions => {
  /** Reads the argument following a flag. */
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }

  const count = Number(value('--count') ?? 50)
  const seed = value('--seed')
  const out = value('--out')

  if (!Number.isInteger(count) || count < 1) throw new Error(`--count must be a positive integer, got "${count}"`)
  if (!seed) throw new Error('--seed is required so the draw can be reproduced')
  if (!out) throw new Error('--out is required')

  return { count, seed, out }
}

/**
 * The rank an issue takes in a seeded draw: the first 13 hex digits of `sha256(seed:number)`, read
 * as a number. Thirteen digits stay inside the exact integer range, which keeps the comparison
 * total rather than collapsing distinct hashes onto the same float.
 */
export const rank = (seed: string, issueNumber: number): number =>
  Number.parseInt(crypto.createHash('sha256').update(`${seed}:${issueNumber}`).digest('hex').slice(0, 13), 16)

/**
 * Builds the sampling frame: issues that a human filed, that a human milestoned, whose milestone is
 * still open, that have a body to classify from, and that no existing sample already covers.
 *
 * An empty body is excluded rather than kept as a hard case. The corpus asserts every sample has
 * one, and an issue whose entire content is its title is a different measurement — how well a title
 * alone classifies — mixed into this one.
 */
export const buildFrame = (issues: Issue[], openMilestones: Set<string>, corpus: Set<number>): Issue[] =>
  issues.filter(
    issue =>
      issue.milestone !== null &&
      openMilestones.has(issue.milestone) &&
      issue.body.trim().length > 0 &&
      !corpus.has(issue.number),
  )

/** Draws `count` issues from the frame by seeded rank, lowest first. */
export const draw = (frame: Issue[], seed: string, count: number): Issue[] =>
  [...frame].sort((a, b) => rank(seed, a.number) - rank(seed, b.number)).slice(0, count)

/** Draws a blind sample and writes it to disk. */
const main = async () => {
  const { count, seed, out } = parseArgs(process.argv.slice(2))
  const repo = process.env.GITHUB_REPOSITORY ?? process.env.ISSUE_CLASSIFIER_REPO ?? DEFAULT_REPO
  const github = new GitHubClient({ repo, token: process.env.GITHUB_TOKEN })

  const [issues, milestones] = await Promise.all([github.listIssues(), github.listOpenMilestones()])
  const openMilestones = new Set(milestones.map(milestone => milestone.title))

  // Every sample directory is excluded, not just `samples/`. A previously drawn set kept in its own
  // directory is still drawn — redrawing one of its issues would quietly hand a "fresh" set an issue
  // that had already been measured, which is the exact failure this script exists to prevent.
  const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const drawnAlready = fs
    .readdirSync(workspace, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('samples'))
    .flatMap(entry => loadSamples(path.join(workspace, entry.name)))
  const corpus = new Set(drawnAlready.map(sample => sample.source!.issue))

  const frame = buildFrame(issues, openMilestones, corpus)
  console.info(
    `${issues.length} issues, ${openMilestones.size} open milestones, ${corpus.size} already drawn ` +
      `→ frame of ${frame.length}`,
  )
  if (frame.length < count) throw new Error(`Frame holds only ${frame.length} issues; cannot draw ${count}`)

  const drawn = draw(frame, seed, count)
  const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', out)
  fs.mkdirSync(outDir, { recursive: true })

  for (const issue of drawn) {
    const sample = {
      input: { body: issue.body, labels: issue.labels, title: issue.title },
      expected: issue.milestone,
      split: 'test',
      source: { issue: issue.number, type: 'github' },
    }
    fs.writeFileSync(path.join(outDir, `issue-${issue.number}.json`), JSON.stringify(sample, null, 2) + '\n')
  }

  // Counts and issue numbers only. Printing a title here would undo the draw.
  const perMilestone = new Map<string, number>()
  for (const issue of drawn) perMilestone.set(issue.milestone!, (perMilestone.get(issue.milestone!) ?? 0) + 1)
  console.info(`\nWrote ${drawn.length} samples to ${out}/ (seed "${seed}")`)
  console.info(
    `Issues: ${drawn
      .map(issue => issue.number)
      .sort((a, b) => a - b)
      .join(' ')}`,
  )
  console.info(`\nMilestone distribution (${perMilestone.size} of ${openMilestones.size} milestones represented):`)
  for (const [milestone, n] of [...perMilestone].sort((a, b) => b[1] - a[1])) {
    console.info(`  ${String(n).padStart(3)}  ${milestone}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
