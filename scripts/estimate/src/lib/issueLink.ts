/**
 * Formats a GitHub issue reference for log output, adapting to the runtime environment.
 *
 * In CI (`process.env.CI` set to anything other than `false`), where terminals such as the
 * GitHub Actions log viewer do not render OSC 8 hyperlinks, the full URL is printed inline as
 * `#N - https://github.com/owner/repo/issues/N` so the link is visible and copyable.
 *
 * Locally, it emits an OSC 8 terminal hyperlink whose visible text is `#N`; terminals that
 * support OSC 8 render it as a clickable link, while terminals that don't simply show the plain
 * `#N` (the escape sequence is inert), keeping log lines compact.
 */
const issueLink = (owner: string, repo: string, issueNumber: number): string => {
  const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`
  const isCI = process.env.CI != null && process.env.CI !== '' && process.env.CI !== 'false'
  return isCI ? `#${issueNumber} - ${url}` : `\u001b]8;;${url}\u001b\\#${issueNumber}\u001b]8;;\u001b\\`
}

export default issueLink
