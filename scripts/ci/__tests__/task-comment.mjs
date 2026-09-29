import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const taskComment = require('../task-comment.cjs')

/** Renders a comment from the fields both automations pass, with the case under test overridden. */
const render = overrides =>
  taskComment({
    markers: ['<!-- dependabot-fix -->'],
    heading: 'Dependabot fix',
    body: ['A check failed on `abc1234`.'],
    taskNumber: 2,
    maxTasks: 3,
    next: null,
    pr: 5203,
    runUrl: 'https://github.test/runs/42',
    workflow: 'Dependabot Fix',
    workflowFile: 'dependabot-fix.yml',
    ...overrides,
  })

/** Verifies the footer names the task, what follows it, and the run that started it. */
const testFooter = async () => {
  assert.equal(
    render({ next: 'The next task is eligible 6 hours after this one.' }),
    [
      '<!-- dependabot-fix -->',
      '### 🤖 Dependabot fix',
      '',
      'A check failed on `abc1234`.',
      '',
      'Task 2 of 3. The next task is eligible 6 hours after this one. Started by [Dependabot Fix](https://github.test/runs/42).',
    ].join('\n'),
  )
}

/** Verifies the last task replaces what follows it with the dispatch that asks for one more. */
const testCapNotice = async () => {
  assert.equal(
    render({ taskNumber: 3, next: 'The next task is eligible 6 hours after this one.' }).split('\n').pop(),
    'Task 3 of 3. No further task starts on its own — run `gh workflow run dependabot-fix.yml -f pr=5203` if it needs another. Started by [Dependabot Fix](https://github.test/runs/42).',
  )
}

/** Verifies a comment written before the first task ends at its body, with nothing to number. */
const testNoFooterBeforeFirstTask = async () => {
  assert.equal(
    render({ taskNumber: 0 }),
    ['<!-- dependabot-fix -->', '### 🤖 Dependabot fix', '', 'A check failed on `abc1234`.'].join('\n'),
  )
}

/** Verifies a comment with no run to link is left unattributed rather than linking nowhere. */
const testUnattributed = async () => {
  assert.equal(render({ runUrl: null }).split('\n').pop(), 'Task 2 of 3.')
}

await testFooter()
await testCapNotice()
await testNoFooterBeforeFirstTask()
await testUnattributed()

console.info('PASS: task-comment')
