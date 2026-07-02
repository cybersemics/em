import { KnownDevices } from 'puppeteer'
import emulate from '../helpers/emulate'
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('toolbar', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  // Regression test for https://github.com/cybersemics/em/issues/4487
  // When the toolbar is at its left edge, a right-swipe cannot change scrollLeft, so the tap-vs-scroll
  // discrimination (which only compared scrollLeft) misread the swipe as a tap and fired the button under
  // the finger (e.g. Undo). The swipe must instead be recognized as a scroll gesture and the command suppressed.
  it('swiping right at the left edge of the toolbar should not activate the button under the finger', async () => {
    await newThought('hello')
    await waitForEditable('hello')

    // Move the toolbar to its left edge so a right-swipe cannot change scrollLeft, and disable the browser's
    // horizontal-overscroll history navigation (a synthetic-swipe artifact, unrelated to the toolbar behavior).
    await page.evaluate(() => {
      const toolbar = document.querySelector('[data-testid="toolbar"]') as HTMLElement
      toolbar.scrollLeft = 0
      document.documentElement.style.overscrollBehavior = 'none'
    })

    // Swipe right starting on the Undo button. On the buggy code Undo fires and removes the thought.
    const undo = await page.$eval('[data-testid="toolbar-icon"][aria-label="Undo"]', el => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })

    const steps = 25
    const distance = 250
    await page.touchscreen.touchStart(undo.x, undo.y)
    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(undo.x + (distance * i) / steps, undo.y)
    }
    await page.touchscreen.touchEnd()

    // The swipe should be treated as a scroll gesture, not a tap, so Undo does not fire and the thought remains.
    expect(await getEditingText()).toBe('hello')
  })
})
