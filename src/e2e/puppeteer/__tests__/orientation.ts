import { KnownDevices } from 'puppeteer'
import closeKeyboard from '../helpers/closeKeyboard'
import deviceEmulation from '../helpers/deviceEmulation'
import newThought from '../helpers/newThought'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Reads the viewport position of the cursor thought and the region left visible below the toolbar. */
const getCursorVisibility = () =>
  page.evaluate(() => {
    const cursor = document.querySelector('[data-editing=true] [data-editable]')
    const toolbar = document.querySelector('[data-testid="toolbar"]')
    if (!cursor || !toolbar) throw new Error('Expected a cursor thought and the toolbar to be rendered.')
    const { top, bottom } = cursor.getBoundingClientRect()
    return { top, bottom, visibleTop: toolbar.getBoundingClientRect().bottom, visibleBottom: window.innerHeight }
  })

describe('orientation', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/issues/3990
  it('keeps the cursor in view when rotating from portrait to landscape', async () => {
    await newThought('a')
    await closeKeyboard()

    await page.setViewport(KnownDevices['iPhone 15 Pro landscape'].viewport)
    await waitForBrowserSettled()

    const { top, bottom, visibleTop, visibleBottom } = await getCursorVisibility()
    expect(top).toBeGreaterThanOrEqual(visibleTop)
    expect(bottom).toBeLessThanOrEqual(visibleBottom)
  })
})
