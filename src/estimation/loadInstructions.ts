import * as fs from 'fs'
import * as path from 'path'

const INSTRUCTIONS_DIR = '.github/instructions/estimate'
const INSTRUCTIONS_FILE = 'estimate.instructions.md'

/** Loads the estimation instructions markdown file from the repository. */
const loadInstructions = (repoRoot: string): string => {
  const filePath = path.join(repoRoot, INSTRUCTIONS_DIR, INSTRUCTIONS_FILE)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Instructions file not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export default loadInstructions
