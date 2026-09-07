#!/usr/bin/env node
/**
 * Translates a flaky-summary.json into `key=value` step outputs on stdout, for appending to
 * $GITHUB_OUTPUT. Used by the `Aggregate flaky-test report` step of
 * .github/workflows/puppeteer-flaky.yml.
 *
 * ```sh
 * node scripts/ci/flaky-outputs.mjs <flaky-summary.json> >> "$GITHUB_OUTPUT"
 * ```
 *
 * A missing summary file means the aggregator crashed before producing one, which is reported as a
 * single infra failure so the workflow still notifies and fails.
 */
import { existsSync, readFileSync } from 'node:fs'

const summaryFile = process.argv[2]
if (!summaryFile) {
  console.error('usage: node scripts/ci/flaky-outputs.mjs <flaky-summary.json>')
  process.exit(2)
}

const summary = existsSync(summaryFile)
  ? JSON.parse(readFileSync(summaryFile, 'utf8'))
  : { clean: false, failedTestCount: 0, infraFailureCount: 1 }

process.stdout.write(
  [
    `clean=${summary.clean}`,
    `flake_count=${summary.failedTestCount ?? summary.flakeCount ?? 0}`,
    `infra_count=${summary.infraFailureCount}`,
    '',
  ].join('\n'),
)
