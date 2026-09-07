/**
/**
 * Formats the `#N` label of a GitHub issue reference for log output, adapting to the environment.
 *
 * In CI (`process.env.CI` set to anything other than `false`), where terminals such as the GitHub
 * Actions log viewer do not render OSC 8 hyperlinks, it emits the plain `#N`. The full URL is
 * appended separately at the end of the log line via issueUrlSuffix — keeping it clear of any
 * trailing punctuation (e.g. a `:`) that a terminal's URL auto-detection would otherwise absorb
 * into the link and break.
 *
 * Locally, it emits an OSC 8 terminal hyperlink whose visible text is `#N`; terminals that support
 * OSC 8 render it as a clickable link, while terminals that don't simply show the plain `#N` (the
 * escape sequence is inert), keeping log lines compact.
 */
const issueLink = (owner: string, repo: string, issueNumber: number): string => {
  const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`
  const isCI = process.env.CI != null && process.env.CI !== '' && process.env.CI !== 'false'
  return isCI ? `#${issueNumber}` : `\u001b]8;;${url}\u001b\\#${issueNumber}\u001b]8;;\u001b\\`
}

export default issueLink
