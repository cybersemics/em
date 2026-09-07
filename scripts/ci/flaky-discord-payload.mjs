#!/usr/bin/env node
/**
 * Builds the Discord webhook JSON payload for a Puppeteer flaky-stress run and writes it to stdout.
 * Used by the `Notify Discord` step of .github/workflows/puppeteer-flaky.yml.
 *
 * ```sh
 * node scripts/ci/flaky-discord-payload.mjs <flaky-summary.json> [flaky-issues.json]
 * ```
 *
 * Each offender is linked to its tracking issue — created or already open — from the issues file
 * written by the `File tracking issues` step, which runs first. An offender with no entry there is
 * one no issue was filed for: a consistent failure, or an overflow past that step's issue cap.
 *
 * A missing summary file means the aggregator crashed before producing one, which gets its own
 * short payload. Reads RUN_URL, FLAKE_COUNT, and INFRA_COUNT from the environment.
 */
import { existsSync, readFileSync } from 'node:fs'

// Discord caps message content at 2000 characters; leave headroom for the closing run URL.
const MAX_CONTENT = 1900

const HEADING = '**Puppeteer flaky-test alert**'

const [summaryFile, issuesFile] = process.argv.slice(2)
if (!summaryFile) {
  console.error('usage: node scripts/ci/flaky-discord-payload.mjs <flaky-summary.json> [flaky-issues.json]')
  process.exit(2)
}

const issues = issuesFile && existsSync(issuesFile) ? JSON.parse(readFileSync(issuesFile, 'utf8')) : []

/**
 * Renders the top offenders as one bullet per failing test, each linked to its tracking issue.
 * Masked links render in message content sent by a webhook, which is how this payload is posted.
 */
const topOffenders = summary =>
  (summary.topOffenders || [])
    .map(t => {
      const issue = issues.find(i => i.file === t.file && i.fullName === t.fullName)
      const link = issue ? ` — [#${issue.number}](${issue.url})` : ''
      return `• ${t.file} › ${t.fullName} — failed ${t.failed}/${t.of}${link}`
    })
    .join('\n') || '(none)'

const content = !existsSync(summaryFile)
  ? [HEADING, 'Aggregator failed before producing a summary.', process.env.RUN_URL].join('\n')
  : [
      HEADING,
      `Failing tests: ${process.env.FLAKE_COUNT} | Infra failures: ${process.env.INFRA_COUNT}`,
      '',
      'Top offenders:',
      topOffenders(JSON.parse(readFileSync(summaryFile, 'utf8'))),
      '',
      process.env.RUN_URL,
    ].join('\n')

process.stdout.write(JSON.stringify({ content: content.slice(0, MAX_CONTENT) }))
