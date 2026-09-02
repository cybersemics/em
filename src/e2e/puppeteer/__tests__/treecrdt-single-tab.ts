import type { ConsoleMessage, Page } from 'puppeteer'
import exportThoughts from '../helpers/exportThoughts'
import paste from '../helpers/paste'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import { page, setPage } from '../session'
import { createTreecrdtTestPage, usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000 })
const thoughtspaceStorage = usePersistentTreecrdtStorage()

const PERSISTENCE_ERROR = /sqlite3_open_v2|SQL logic error|database is locked|Thoughtspace persistence failed|TreeCRDT/i

/** Captures page failures that would otherwise be easy to miss behind the bootstrap screen. */
const captureRuntimeErrors = (target: Page, errors: string[]): void => {
  target.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)))
  target.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' && PERSISTENCE_ERROR.test(message.text())) errors.push(message.text())
  })
}

it('keeps one active tab across refreshes and successive tab handoffs', async () => {
  const errors: string[] = []
  const first = page

  await paste('persisted in the first tab')
  expect(await exportThoughts()).toContain('persisted in the first tab')

  await refresh()
  // Startup after a reload opens the OPFS database and hydrates the thought, which can take longer than the default 6 s.
  await waitForEditable('persisted in the first tab', { timeout: 10000 })
  expect(await exportThoughts()).toContain('persisted in the first tab')

  const sessionId = await first.evaluate(() => localStorage.getItem('tsid'))
  if (!sessionId) throw new Error('Expected the Puppeteer session to define a tsid')
  const second = await createTreecrdtTestPage(first.browserContext(), thoughtspaceStorage)
  const third = await createTreecrdtTestPage(first.browserContext(), thoughtspaceStorage)
  captureRuntimeErrors(second, errors)
  captureRuntimeErrors(third, errors)

  await second.goto(first.url(), { waitUntil: 'load' })
  await third.goto(first.url(), { waitUntil: 'load' })
  expect(await second.evaluate(() => localStorage.getItem('tsid'))).toBe(sessionId)
  expect(await third.evaluate(() => localStorage.getItem('tsid'))).toBe(sessionId)
  await second.waitForSelector('[aria-label=thoughtspace-in-use]')
  await third.waitForSelector('[aria-label=thoughtspace-in-use]')

  expect(await second.$('#content')).toBeNull()
  expect(await third.$('#content')).toBeNull()
  expect(errors).toEqual([])

  await first.close()
  await second.bringToFront()
  setPage(second)

  await second.waitForFunction(
    async lockName => {
      const snapshot = await navigator.locks.query()
      return !snapshot.held?.some(lock => lock.name === lockName)
    },
    {},
    `em-treecrdt-session:${sessionId}`,
  )

  await Promise.all([
    second.waitForNavigation({ waitUntil: 'load' }),
    second.evaluate(() => (document.querySelector('[aria-label=retry-thoughtspace]') as HTMLElement | null)?.click()),
  ])
  await waitForEditable('persisted in the first tab', { timeout: 10000 })
  expect(await second.evaluate(() => localStorage.getItem('tsid'))).toBe(sessionId)

  expect(await exportThoughts()).toContain('persisted in the first tab')
  expect(errors).toEqual([])

  await refresh()
  await waitForEditable('persisted in the first tab', { timeout: 10000 })

  expect(await exportThoughts()).toContain('persisted in the first tab')
  expect(errors).toEqual([])

  await third.bringToFront()
  await Promise.all([
    third.waitForNavigation({ waitUntil: 'load' }),
    third.evaluate(() => (document.querySelector('[aria-label=retry-thoughtspace]') as HTMLElement | null)?.click()),
  ])
  await third.waitForSelector('[aria-label=thoughtspace-in-use]')
  expect(await third.$('#content')).toBeNull()

  await second.close()
  setPage(third)

  await third.waitForFunction(
    async lockName => {
      const snapshot = await navigator.locks.query()
      return !snapshot.held?.some(lock => lock.name === lockName)
    },
    {},
    `em-treecrdt-session:${sessionId}`,
  )

  await Promise.all([
    third.waitForNavigation({ waitUntil: 'load' }),
    third.evaluate(() => (document.querySelector('[aria-label=retry-thoughtspace]') as HTMLElement | null)?.click()),
  ])
  await waitForEditable('persisted in the first tab', { timeout: 10000 })

  expect(await exportThoughts()).toContain('persisted in the first tab')
  expect(errors).toEqual([])
})
