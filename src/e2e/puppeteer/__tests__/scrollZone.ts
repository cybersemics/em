import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

// Long enough to wrap the full width of the viewport, so that the text extends underneath the scroll zone.
const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const DUIS = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

it.skip('does not place the cursor in the thought underneath the scroll zone', async () => {
  await paste(`
- ${LOREM}
- ${DUIS}
`)
  await waitForEditable(LOREM)
  await waitForEditable(DUIS)

  // Measure the first line of the first thought and the horizontal bounds of the scroll zone. The touch that
  // reproduces #4272 lands on the first thought's text where it extends underneath the scroll zone, while the
  // cursor is in another thought. On Android that starts Chrome's native caret drag, which moves the caret and
  // raises the magnifier; headless Chrome has no caret drag, so the test asserts the cause instead: a touch in
  // the scroll zone must not reach the thought underneath.
  const { scrollZoneX, textX, y } = await page.evaluate(value => {
    const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
      element => element.innerHTML === value,
    )
    if (!editable) throw new Error(`Thought "${value}" is not rendered.`)
    const scrollZone = document.querySelector('[data-testid="scroll-zone"]')
    if (!scrollZone) throw new Error('Scroll zone is not rendered.')

    const range = document.createRange()
    range.selectNodeContents(editable)
    const firstLine = range.getClientRects()[0]
    const { left, width } = scrollZone.getBoundingClientRect()

    // Tap the middle of the overlap between the first line and the scroll zone, i.e. where the thought's text
    // runs underneath the scroll zone. Word wrap leaves the line ending short of the viewport edge, so the
    // overlap is measured rather than assumed.
    const overlapLeft = Math.max(firstLine.left, left)
    const overlapRight = Math.min(firstLine.right, left + width)
    if (overlapRight - overlapLeft < 8) {
      throw new Error(
        `The first line of "${value}" spans ${firstLine.left}–${firstLine.right} and does not run underneath the scroll zone at ${left}–${left + width}.`,
      )
    }

    return {
      scrollZoneX: (overlapLeft + overlapRight) / 2,
      textX: left - 10,
      y: (firstLine.top + firstLine.bottom) / 2,
    }
  }, LOREM)

  // A touch on the same line outside the scroll zone places the cursor, which establishes that the line is
  // touchable at this y and that the scroll zone is the only difference between the two touches.
  await page.touchscreen.tap(textX, y)
  await waitForCursor(LOREM)

  await clickThought(DUIS)
  await waitForCursor(DUIS)

  await page.touchscreen.tap(scrollZoneX, y)
  await waitForBrowserSettled()

  expect(await getEditingText()).toBe(DUIS)
})
