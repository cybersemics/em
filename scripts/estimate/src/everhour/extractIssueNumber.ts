import type { EverhourTask } from './types.ts'

/**
 * Extracts a GitHub issue number from an Everhour task.
 *
 * Tries three strategies in order:
 * 1. **Task ID** — standard Everhour GitHub format `gh:REPO_ID:ISSUE_NUMBER`
 * 2. **foreignId** — numeric string returned by some Everhour API versions for GitHub-linked tasks
 * 3. **Task name** — `#NUMBER` appearing anywhere in the name (e.g. `"Fix bug (#123)"` or `"#123 Title"`).
 *
 * Returns `null` when no issue number can be extracted (e.g. manually-created Everhour tasks that have
 * no GitHub counterpart).
 */
const extractIssueNumber = (task: EverhourTask): number | null => {
  // Strategy 1: task ID in the standard Everhour GitHub format "gh:REPO_ID:ISSUE_NUMBER"
  const parts = task.id.split(':')
  if (parts.length >= 3) {
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num)) return num
  }

  // Strategy 2: foreignId field returned by some Everhour API versions
  if (task.foreignId) {
    const num = parseInt(task.foreignId, 10)
    if (!isNaN(num)) return num
  }

  // Strategy 3: "#NUMBER" anywhere in the task name (e.g. "Fix bug (#123)" or "#123 Title")
  const match = task.name.match(/#(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export default extractIssueNumber
