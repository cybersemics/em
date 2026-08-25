import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/** The corpus sits beside the code that loads it, two levels up from src/lib. */
const samplesFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../samples.jsonl')

/**
 * A labeled issue used to measure selection accuracy.
 *
 * Unlike the estimator's samples, these are never placed in the prompt — the prompt teaches the
 * categories through the definition table and example titles instead. Holding the samples out
 * entirely is what makes `yarn evaluate` a measurement rather than a memory test.
 */
export interface Sample {
  input: {
    title: string
    body: string
    labels: string[]
  }
  /** Title of the correct milestone, or null when no existing milestone fits and a human should be asked. */
  expected: string | null
  /**
   * Which half of the corpus this sample belongs to. `train` is for reading errors and revising the
   * prompt; `test` is held out so a revised prompt can be scored against issues it was not tuned on.
   * Assigned by alternating over a milestone-ordered list, so both halves span the taxonomy.
   */
  split: 'train' | 'test'
  source?: {
    type: string
    issue: number
  }
}

/**
 * Loads every labeled sample from a JSONL file, one sample per line, in file order.
 *
 * One file rather than a file per issue. The corpus is read as a whole by everything that touches it
 * and is never edited one issue at a time, so a directory of 144 files bought nothing and cost a
 * sixth of the repository's file count and a diff no reviewer could scan. A line-per-sample format
 * keeps a label change legible as a one-line diff, which is the only granularity that ever mattered.
 *
 * The path is a parameter so that a freshly drawn corpus can be evaluated from its own file without
 * being merged into this one. Merging is the irreversible move: the samples here have been read, and
 * a set that has been read cannot be un-read back into a blind measurement.
 *
 * Nothing here reaches the network. The labels are the part that cannot be recovered from GitHub —
 * `split` does not exist there, and `expected: null` records that asking is the right answer rather
 * than that a milestone is missing — and re-fetching the rest would make the corpus drift under the
 * measurement, silently, in whichever direction the repository happened to move.
 */
const loadSamples = (file: string = samplesFile): Sample[] => {
  if (!fs.existsSync(file)) {
    return []
  }

  return fs
    .readFileSync(file, 'utf-8')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as Sample
      } catch (error) {
        // Name the line. A corpus of hundreds of samples on one line each is unreadable to bisect by
        // hand, and "Unexpected token" with no location is the least useful thing to hand someone.
        throw new Error(`${path.basename(file)} line ${index + 1} is not valid JSON: ${(error as Error).message}`)
      }
    })
}

export default loadSamples
