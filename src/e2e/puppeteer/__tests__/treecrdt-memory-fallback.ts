import type { ConsoleMessage } from 'puppeteer'
import exportThoughts from '../helpers/exportThoughts'
import press from '../helpers/press'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })
usePersistentTreecrdtStorage()

it('completes a multiline paste when persistent storage falls back to memory', async () => {
  const warnings: string[] = []
  /** Captures the storage fallback warning emitted during initialization. */
  const captureWarning = (message: ConsoleMessage) => {
    if (message.type() === 'warn') warnings.push(message.text())
  }
  page.on('console', captureWarning)

  // Exceed SQLite's path capacity so the real dedicated-worker OPFS open fails deterministically.
  await page.evaluateOnNewDocument(() => localStorage.setItem('tsid', 'x'.repeat(512)))
  await page.reload({ waitUntil: 'load' })
  const initialized = await page.evaluate(() =>
    window.em.testHelpers.waitForInitialized().then(
      () => true,
      () => false,
    ),
  )

  expect(initialized).toBe(true)
  expect(warnings).toContain(
    'Persistent thoughtspace storage is unavailable. em is using temporary in-memory storage; changes will be lost when this page reloads or closes.',
  )

  await press('Enter')
  await page.evaluate(async text => {
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }) })])
  }, 'AAA\n  111\n    222\n    333\nBBB\nCCC')
  await press('Insert', { shift: true })

  await waitForThoughtExistInDb('CCC')
  await page.evaluate(() => window.em.testHelpers.waitForThoughtspaceRuntimeIdle())
  expect((await exportThoughts()).trim()).toBe(`- AAA
  - 111
    - 222
    - 333
- BBB
- CCC`)

  page.off('console', captureWarning)
})
