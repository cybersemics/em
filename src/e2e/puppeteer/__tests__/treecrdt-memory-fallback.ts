import type { ConsoleMessage } from 'puppeteer'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import { page } from '../session'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })
usePersistentTreecrdtStorage()

it('keeps the thoughtspace writable when persistent storage falls back to memory', async () => {
  const warnings: string[] = []
  /** Captures the storage fallback warning emitted during initialization. */
  const captureWarning = (message: ConsoleMessage) => {
    if (message.type() === 'warn') warnings.push(message.text())
  }
  page.on('console', captureWarning)

  // Exceed SQLite's path capacity so the real dedicated-worker OPFS open fails deterministically.
  await page.evaluateOnNewDocument(() => localStorage.setItem('tsid', 'x'.repeat(512)))
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => window.em.testHelpers.waitForInitialized())

  expect(warnings).toContain(
    'Persistent thoughtspace storage is unavailable. em is using temporary in-memory storage; changes will be lost when this page reloads or closes.',
  )

  await press('Enter')
  await keyboard.type('fallback write')
  await waitForThoughtExistInDb('fallback write')

  page.off('console', captureWarning)
})
