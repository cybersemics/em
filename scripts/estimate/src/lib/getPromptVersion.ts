import { execSync } from 'child_process'

/**
 * Gets the full git commit hash of the most recent change to the estimate instructions file.
 * Used to tag AI-generated estimates with the prompt version for auditability. The full SHA (rather
 * than the abbreviated hash) is returned so it can be embedded verbatim in a GitHub blob URL that
 * links to the prompt file as it existed at that commit. Returns 'unknown' when git is unavailable.
 */
const getPromptVersion = (repoRoot: string): string => {
  try {
    return execSync('git log -1 --format=%H -- .github/instructions/estimate/estimate.instructions.md', {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

export default getPromptVersion
