import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('opens the pinned command over the Command Universe without closing it', async () => {
  await command('openMobileCommandUniverse')
  await click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await click('button[aria-label="Pin Command"]')
  await page.waitForSelector('[data-testid="pinned-command"]', { visible: true })

  // Visible means nothing covers it: the dialog's blurred backdrop spans the viewport, so whatever is on top at the
  // ring's center is what the user sees there.
  const topmostAtRing = await page.$eval('[data-testid="pinned-command"]', ring => {
    const { x, y, width, height } = ring.getBoundingClientRect()
    const topmost = document.elementFromPoint(x + width / 2, y + height / 2)
    return ring.contains(topmost) ? 'the pinned command' : (topmost?.className.toString() ?? 'nothing')
  })
  expect(topmostAtRing).toBe('the pinned command')

  await click('[data-testid="pinned-command"]')

  const tooltipSelector = '[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])'
  try {
    await page.waitForSelector(tooltipSelector, { visible: true, timeout: 5000 })
  } catch {
    const isCommandUniverseOpen = !!(await page.$('button[aria-label="Unpin Command"]'))
    throw new Error(
      `Expected the pinned command's tooltip to open over the Command Universe, but it did not. The Command Universe is ${isCommandUniverseOpen ? 'open' : 'closed'}.`,
    )
  }
  expect(await page.$eval(tooltipSelector, el => el.textContent)).toContain('Trace the gesture to practice.')
  expect(await page.$eval('button[aria-label="Unpin Command"]', el => !el.closest('[inert]'))).toBe(true)
})
