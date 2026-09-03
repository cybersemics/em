/**
 * Returns the trailing ` - <url>` suffix that surfaces a GitHub issue URL at the very end of a CI
 * log line, or an empty string when not in CI.
 *
 * Complements issueLink: in CI the `#N` label is plain text (no OSC 8 hyperlink), so the full URL
 * has to be shown for it to be reachable. Appending it at the end of the line — rather than inline
 * after `#N` — keeps it clear of any following punctuation (e.g. `: S / 4h`) that a terminal's URL
 * auto-detection would otherwise swallow into the link and break.
 *
 * Locally the URL lives in the OSC 8 escape emitted by issueLink, so no suffix is needed.
 */
const issueUrlSuffix = (owner: string, repo: string, issueNumber: number): string => {
  const isCI = process.env.CI != null && process.env.CI !== '' && process.env.CI !== 'false'
  return isCI ? ` - https://github.com/${owner}/${repo}/issues/${issueNumber}` : ''
}

export default issueUrlSuffix
