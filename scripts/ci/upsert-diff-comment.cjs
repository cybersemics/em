/**
 * Upserts the Puppeteer snapshot-diff PR comment. Renders diffs inline from fixed raw URLs on the
 * `snapshot-diffs` branch, or a resolved message when the latest run had no diffs.
 *
 * Loaded by the `Upsert PR comment` step of .github/workflows/puppeteer-diff-comment.yml through
 * actions/github-script. Reads the manifest written by the publish step, plus PR, AUTHOR, RUN_ID,
 * RUN_URL, and COLLECTED from the environment.
 */
const fs = require('node:fs')

const MARKER = '<!-- puppeteer-diff -->'

const HEADING = '### 🖼️ Puppeteer snapshot diffs'

/** HTML-escapes a string defensively (filenames are already allowlisted upstream). */
const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * Renders one diff image as a table whose header labels the three panels of jest-image-snapshot's
 * composite. The image spans all three columns, so the percentage widths — which GitHub's sanitizer
 * preserves, unlike `style` — keep the labels aligned over their panels as the image scales down.
 */
const diffTable = ({ label, url }) =>
  [
    '<table width="100%">',
    '  <tr>',
    `    <th colspan="3" align="left">${label}</th>`,
    '  </tr>',
    '  <tr>',
    '    <th width="34%">Expected (base branch)</th>',
    '    <th width="32%">Diff</th>',
    '    <th width="34%">Actual (PR branch)</th>',
    '  </tr>',
    '  <tr>',
    `    <td colspan="3"><img src="${url}" alt="${label}" width="900" /></td>`,
    '  </tr>',
    '</table>',
  ].join('\n')

/** Comment body listing every diff image inline, with the command to update the affected snapshots. */
const diffBody = ({ rels, base, author, runUrl }) => {
  const blocks = rels
    .map(rel => {
      const url = `${base}/${rel.split('/').map(encodeURIComponent).join('/')}`
      // ui/__diff_output__/thought-1-diff.png -> ui / thought-1, matching the snapshot's own name.
      const label = esc(rel.replace('/__diff_output__/', ' / ').replace(/-diff\.png$/, ''))
      return diffTable({ label, url })
    })
    .join('\n\n')
  const authorMention = author ? `@${esc(author)}` : ''
  // The first path segment of each diff is the test file name (snapshots live in
  // __image_snapshots__/{testFile}/). Derive the unique set to emit a single targeted update
  // command scoped to the affected test files.
  const testFiles = [...new Set(rels.map(rel => rel.split('/')[0]))].filter(Boolean).sort()
  const updateCommand = `yarn test:puppeteer -u ${testFiles.map(esc).join(' ')}`
  return [
    MARKER,
    HEADING,
    '',
    `${authorMention}: These snapshot tests failed, which indicates a visual regression. Please review your changes.`,
    '',
    `<details open><summary>${rels.length} broken snapshot${rels.length === 1 ? '' : 's'}</summary>`,
    '',
    blocks,
    '',
    '</details>',
    '',
    `[Workflow run](${runUrl})`,
    '',
    'If the visual changes are intentional, update the snapshots for the affected test files:',
    '',
    `\`\`\`\n${updateCommand}\n\`\`\``,
  ].join('\n')
}

/** Comment body for a run that produced no diffs, clearing any previously reported ones. */
const resolvedBody = ({ runId, runUrl }) =>
  [
    MARKER,
    HEADING,
    '',
    `✅ No snapshot diffs in the latest run (${runId}). Any previously reported diffs have been cleared.`,
    '',
    `[Workflow run](${runUrl})`,
  ].join('\n')

/** Creates or updates the single marked snapshot-diff comment on the PR. */
const upsertDiffComment = async ({ github, context }) => {
  const { owner, repo } = context.repo
  const prNumber = Number(process.env.PR)
  const runId = process.env.RUN_ID
  const runUrl = process.env.RUN_URL
  const author = process.env.AUTHOR
  const collected = Number(process.env.COLLECTED || '0')

  let body
  if (collected > 0) {
    const manifest = fs.readFileSync(`${process.env.GITHUB_WORKSPACE}/committed-images.txt`, 'utf8')
    const rels = manifest
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/snapshot-diffs/pr-${prNumber}/${runId}`
    body = diffBody({ rels, base, author, runUrl })
  } else {
    body = resolvedBody({ runId, runUrl })
  }

  const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number: prNumber })
  const existing = comments.find(c => c.body && c.body.includes(MARKER))
  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body })
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body })
  }
}

module.exports = upsertDiffComment
