import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import deviceEmulation from '../helpers/deviceEmulation'
import paste from '../helpers/paste'
import waitForCursor from '../helpers/waitForCursor'
import waitForUrlCursor from '../helpers/waitForUrlCursor'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Resolves once the throttled url update has moved the address bar off `pathname`. */
const waitForUrlChange = (pathname: string) =>
  page.waitForFunction(previous => window.location.pathname !== previous, { timeout: 5000 }, pathname)

describe('url history on touch devices', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/issues/4115
  it('does not add a browser history entry when the cursor moves on a touch device', async () => {
    await paste(`
      - a
      - b
    `)

    await clickThought('a')
    await waitForUrlCursor('a')
    const entriesBefore = await page.evaluate(() => window.history.length)

    await clickThought('b')
    await waitForUrlCursor('b')
    const entriesAfter = await page.evaluate(() => window.history.length)

    // Each cursor move used to push an entry, giving Mobile Safari's edge swipe a stale rendering of
    // em to navigate back to — which is what painted a second gesture menu over the live one.
    expect(entriesAfter).toBe(entriesBefore)
  })
})

describe('url history on desktop', () => {
  // https://github.com/cybersemics/em/issues/4114
  it('browser back skips history entries of a deleted thought', async () => {
    await paste(`
      - One
      - Two
      - Three
      - Four
      - Five
    `)

    await clickThought('Five')
    await waitForUrlChange('/')

    const pathnameFive = await page.evaluate(() => window.location.pathname)
    await clickToolbar('Indent')
    await waitForUrlChange(pathnameFive)

    const pathnameFourFive = await page.evaluate(() => window.location.pathname)
    await clickThought('Two')
    await waitForUrlChange(pathnameFourFive)

    const pathnameTwo = await page.evaluate(() => window.location.pathname)
    await clickToolbar('Indent')
    await waitForUrlChange(pathnameTwo)

    const pathnameOneTwo = await page.evaluate(() => window.location.pathname)
    await clickToolbar('Delete')
    await waitForCursor('One')
    await waitForUrlChange(pathnameOneTwo)

    await page.goBack()

    // Every entry after Four/Five points to Two, which no longer exists, so Back lands on Five.
    try {
      await page.waitForFunction(
        () => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML === 'Five',
        { timeout: 5000 },
      )
    } catch {
      const cursor = await page.evaluate(
        () => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML ?? null,
      )
      throw new Error(`Expected the cursor to move back to "Five", but it is on ${JSON.stringify(cursor)}.`)
    }
  })

  // https://github.com/cybersemics/em/issues/5747
  it('browser back preserves direction after revisiting and deleting a history thought', async () => {
    await paste(`
      - A
      - B
      - C
    `)

    // Wait for the url to name each thought rather than for it to change: paste moves the cursor to C, and its
    // throttled url write can land after a click on A, which a change from the previous url would mistake for A's.
    await clickThought('A')
    await waitForUrlCursor('A')

    await clickThought('C')
    await waitForUrlCursor('C')
    await page.goBack()
    await waitForCursor('A')

    await clickThought('C')
    await waitForCursor('C')

    await clickToolbar('Delete')
    await waitForCursor('B')

    await page.goBack()

    try {
      await page.waitForFunction(
        () => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML === 'A',
        { timeout: 5000 },
      )
    } catch {
      const cursor = await page.evaluate(
        () => document.querySelector('[data-editing=true] [data-editable]')?.innerHTML ?? null,
      )
      throw new Error(`Expected the cursor to move back to "A", but it is on ${JSON.stringify(cursor)}.`)
    }
  })
})
