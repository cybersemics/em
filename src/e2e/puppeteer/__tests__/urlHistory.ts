import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import paste from '../helpers/paste'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

/** Resolves once the throttled url update has moved the address bar off `pathname`. */
const waitForUrlChange = (pathname: string) =>
  page.waitForFunction(previous => window.location.pathname !== previous, { timeout: 5000 }, pathname)

describe('url history', () => {
  // https://github.com/cybersemics/em/issues/4115
  it('does not add a browser history entry when the cursor moves on a touch device', async () => {
    await paste(`
      - a
      - b
    `)

    await clickThought('a')
    await waitForUrlChange('/')
    const entriesBefore = await page.evaluate(() => window.history.length)

    const pathnameA = await page.evaluate(() => window.location.pathname)
    await clickThought('b')
    await waitForUrlChange(pathnameA)
    const entriesAfter = await page.evaluate(() => window.history.length)

    // Each cursor move used to push an entry, giving Mobile Safari's edge swipe a stale rendering of
    // em to navigate back to — which is what painted a second gesture menu over the live one.
    expect(entriesAfter).toBe(entriesBefore)
  })
})
