/**
 * Formats a GitHub issue reference as an OSC 8 terminal hyperlink to the issue on GitHub.com.
 *
 * The visible text is `#N`; terminals that support OSC 8 render it as a clickable link, while
 * terminals that don't simply show the plain `#N` (the escape sequence is inert). The full URL
 * is never printed, keeping log lines compact.
 */
const issueLink = (owner: string, repo: string, issueNumber: number): string => {
  const url = `https://github.com/${owner}/${repo}/issues/${issueNumber}`
  return `\u001b]8;;${url}\u001b\\#${issueNumber}\u001b]8;;\u001b\\`
}

export default issueLink
