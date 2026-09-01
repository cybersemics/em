/**
 * Formats a prompt version (a full git commit SHA) as a markdown link to the estimate instructions
 * file as it existed at that commit.
 *
 * A bare commit hash in a GitHub comment auto-links to the commit page; an explicit blob link points
 * at the prompt file itself, which is the artifact reviewers actually want to inspect. The visible
 * text is the abbreviated 7-character hash. When the version is 'unknown' (git lookup failed) the
 * plain text is returned with no link.
 */
const promptVersionLink = (owner: string, repo: string, version: string): string => {
  if (version === 'unknown') return version
  const url = `https://github.com/${owner}/${repo}/blob/${version}/.github/instructions/estimate/estimate.instructions.md`
  return `[${version.slice(0, 7)}](${url})`
}

export default promptVersionLink
