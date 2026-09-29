import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

/** The prompt assets sit beside the code that loads them, two levels up from src/lib. */
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Loads the milestone selection instructions used as the system message.
 *
 * Resolved from this module's own location rather than a repository root passed in by the caller, so
 * it loads correctly whatever directory the script was invoked from — the workflow runs it from the
 * repository root, and `yarn issue` runs it from the workspace.
 */
const loadInstructions = (): string => {
  const filePath = path.join(workspaceRoot, 'instructions.md')
  if (!fs.existsSync(filePath)) {
    throw new Error(`Instructions file not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf-8')
}

export default loadInstructions
