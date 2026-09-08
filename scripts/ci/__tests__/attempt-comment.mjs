import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const attemptComment = require('../attempt-comment.cjs')

/** Renders a comment from the fields both automations pass, with the case under test overridden. */
const render = overrides =>
  attemptComment({
    markers: ['<!-- dependabot-fix -->'],
    heading: 'Dependabot fix',
    body: ['A check failed on `abc1234`.'],
    attempt: 2,
    maxAttempts: 3,
    next: null,
    pr: 5203,
    runUrl: 'https://github.test/runs/42',
    workflow: 'Dependabot Fix',
    workflowFile: 'dependabot-fix.yml',
    ...overrides,
  })

/** Verifies the footer names the attempt, what follows it, and the run that started it. */
const testFooter = async () => {
  assert.equal(
    render({ next: 'The next attempt is eligible 6 hours after this one.' }),
    [
      '<!-- dependabot-fix -->',
      '### 🤖 Dependabot fix',
      '',
      'A check failed on `abc1234`.',
      '',
      'Attempt 2 of 3. The next attempt is eligible 6 hours after this one. Started by [Dependabot Fix](https://github.test/runs/42).',
    ].join('\n'),
  )
}

/** Verifies the last attempt replaces what follows it with the dispatch that asks for one more. */
const testCapNotice = async () => {
  assert.equal(
    render({ attempt: 3, next: 'The next attempt is eligible 6 hours after this one.' }).split('\n').pop(),
    'Attempt 3 of 3. No further attempt starts on its own — run `gh workflow run dependabot-fix.yml -f pr=5203` if it needs another. Started by [Dependabot Fix](https://github.test/runs/42).',
  )
}

/** Verifies a comment written before the first attempt ends at its body, with nothing to number. */
const testNoFooterBeforeFirstAttempt = async () => {
  assert.equal(
    render({ attempt: 0 }),
    ['<!-- dependabot-fix -->', '### 🤖 Dependabot fix', '', 'A check failed on `abc1234`.'].join('\n'),
  )
}

/** Verifies a comment with no run to link is left unattributed rather than linking nowhere. */
const testUnattributed = async () => {
  assert.equal(render({ runUrl: null }).split('\n').pop(), 'Attempt 2 of 3.')
}

await testFooter()
await testCapNotice()
await testNoFooterBeforeFirstAttempt()
await testUnattributed()

console.info('PASS: attempt-comment')
