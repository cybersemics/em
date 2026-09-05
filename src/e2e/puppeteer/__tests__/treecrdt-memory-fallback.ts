import type { ConsoleMessage } from 'puppeteer'
import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import waitForThoughtspaceIdle from '../helpers/waitForThoughtspaceIdle'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })
usePersistentTreecrdtStorage()

it('keeps the thoughtspace writable when persistent storage falls back to memory', async () => {
  const warnings: string[] = []
  const persistenceErrors: string[] = []
  /** Captures the storage fallback warning emitted during initialization and any persistence failure logged by the push queue. */
  const captureConsole = (message: ConsoleMessage) => {
    if (message.type() === 'warn') warnings.push(message.text())
    if (message.type() === 'error' && /Thoughtspace persistence failed/.test(message.text())) {
      persistenceErrors.push(message.text())
    }
  }
  page.on('console', captureConsole)

  // Exceed SQLite's path capacity so the real dedicated-worker OPFS open fails deterministically.
  await page.evaluateOnNewDocument(() => localStorage.setItem('tsid', 'x'.repeat(512)))
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())

  expect(warnings).toContain(
    'Persistent thoughtspace storage is unavailable. em is using temporary in-memory storage; changes will be lost when this page reloads or closes.',
  )

  await press('Enter')
  await keyboard.type('fallback write')
  // A typed edit commits on a throttle; running a command flushes it, so leaving the thought with Escape commits it the
  // way it would for a user.
  await press('Escape')

  expect(await exportThoughts()).toBe(`
- fallback write
`)

  // The write barrier rejects if a queued write failed, so resolving here proves the in-memory fallback committed the
  // edit. The push queue also logs a failed write as a console error, which must not have arrived by now either.
  await waitForThoughtspaceIdle()
  expect(persistenceErrors).toEqual([])

  page.off('console', captureConsole)
})
