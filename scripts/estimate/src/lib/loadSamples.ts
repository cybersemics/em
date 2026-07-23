import * as fs from 'fs'
import * as path from 'path'

const SAMPLES_DIR = '.github/instructions/estimate/samples'
const MAX_SAMPLES = 100

/** A sample for estimation training. */
export interface EstimateSample {
  input: {
    title: string
    body: string
    labels: string[]
  }
  expected: string
  source?: {
    type: string
    issue: number
    comment?: number
    hours: number
  }
  /** Source filename (e.g. `issue-1540.json`), populated at load. Used to key the embeddings cache. */
  file?: string
}

/** Loads all estimation samples from the samples directory. Throws if sample count exceeds MAX_SAMPLES. */
const loadSamples = (repoRoot: string): EstimateSample[] => {
  const samplesPath = path.join(repoRoot, SAMPLES_DIR)
  if (!fs.existsSync(samplesPath)) {
    return []
  }

  const files = fs.readdirSync(samplesPath).filter(f => f.endsWith('.json'))

  if (files.length > MAX_SAMPLES) {
    throw new Error(
      `Sample count (${files.length}) exceeds cap (${MAX_SAMPLES}). Add sample selection logic before increasing the cap.`,
    )
  }

  return files.map(file => {
    const content = fs.readFileSync(path.join(samplesPath, file), 'utf-8')
    return { ...(JSON.parse(content) as EstimateSample), file }
  })
}

export default loadSamples
