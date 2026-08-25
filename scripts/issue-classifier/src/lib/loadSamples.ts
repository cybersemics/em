import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/** The samples sit beside the code that loads them, two levels up from src/lib. */
const samplesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../samples')

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

/** Loads every labeled sample, sorted by filename for a stable report order. */
const loadSamples = (): Sample[] => {
  if (!fs.existsSync(samplesDir)) {
    return []
  }

  return fs
    .readdirSync(samplesDir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => JSON.parse(fs.readFileSync(path.join(samplesDir, file), 'utf-8')) as Sample)
}

export default loadSamples
