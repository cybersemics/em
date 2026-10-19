import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import closeKeyboard from '../helpers/closeKeyboard'
import deviceEmulation from '../helpers/deviceEmulation'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
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

/** Reads the position of the cursor thought from the top of the document. */
const getCursorDocumentTop = () =>
  page.evaluate(() => {
    const cursor = document.querySelector('[data-editing=true] [data-editable]')
    if (!cursor) throw new Error('Expected a cursor thought to be rendered.')
    return Math.round(cursor.getBoundingClientRect().top + window.scrollY)
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

  // https://github.com/cybersemics/em/issues/5972
  it('keeps the cursor at the same position in the document when rotating with hidden thoughts above the cursor', async () => {
    // Enough siblings that the space hidden above the cursor is taller than the landscape viewport but shorter than the portrait one.
    await paste(`
      - a
      - b
      - c
      - d
      - e
      - f
      - g
      - h
        - i
        - j
        - k
        - l
        - m
        - n
        - o
          - p
            - q
    `)
    await clickThought('h')
    await clickThought('o')
    await clickThought('p')
    await clickThought('q')
    await waitForCursor('q')
    await closeKeyboard()
    await waitForBrowserSettled()
    const cursorTopBefore = await getCursorDocumentTop()

    await page.setViewport(KnownDevices['iPhone 15 Pro landscape'].viewport)
    await waitForBrowserSettled()

    const cursorTopAfter = await getCursorDocumentTop()
    expect(cursorTopAfter).toBe(cursorTopBefore)
  })
})
