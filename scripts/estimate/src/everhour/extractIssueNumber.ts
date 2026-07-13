import type { EverhourTask } from './types.ts'

/**
 * Extracts a GitHub issue number from an Everhour task.
 *
 * Tries several strategies in order:
 * 1. **Task ID** — standard Everhour GitHub format `gh:REPO_ID:ISSUE_NUMBER`
 * 2. **number** — explicit issue-number field returned by Everhour for GitHub-linked tasks. Covers
 *    the `gh:ISSUE_ID` task-ID form (2 segments) where the ID is GitHub's internal issue database ID
 *    rather than the issue number, so strategy 1 cannot apply.
 * 3. **URL** — GitHub issue/PR URL, e.g. `https://github.com/owner/repo/issues/76`
 * 4. **foreignId** — numeric string returned by some Everhour API versions for GitHub-linked tasks
 * 5. **Task name** — `#NUMBER` appearing anywhere in the name (e.g. `"Fix bug (#123)"` or `"#123 Title"`).
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

  // Strategy 2: explicit "number" field returned by Everhour for GitHub-linked tasks. Preferred over
  // URL scraping since it is a structured field rather than a value parsed out of a string.
  if (task.number) {
    const num = parseInt(task.number, 10)
    if (!isNaN(num)) return num
  }

  // Strategy 3: GitHub issue/PR URL, e.g. "https://github.com/owner/repo/issues/76". Matches pull
  // request URLs too — issues and PRs share GitHub's number space, and the caller detects and skips
  // PRs with an accurate reason.
  if (task.url) {
    const match = task.url.match(/\/(?:issues|pull)\/(\d+)/)
    if (match) return parseInt(match[1], 10)
  }

  // Strategy 4: foreignId field returned by some Everhour API versions
  if (task.foreignId) {
    const num = parseInt(task.foreignId, 10)
    if (!isNaN(num)) return num
  }

  // Strategy 5: "#NUMBER" anywhere in the task name (e.g. "Fix bug (#123)" or "#123 Title")
  const match = task.name.match(/#(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export default extractIssueNumber
