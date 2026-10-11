import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

// Long enough to wrap the full width of the viewport, so that the text extends underneath the scroll zone.
const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const DUIS = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

it('places the cursor in the thought underneath the scroll zone', async () => {
  await paste(`
- ${LOREM}
- ${DUIS}
`)
  await waitForEditable(LOREM)
  await waitForEditable(DUIS)

  // Measure the first line of the first thought and the horizontal bounds of the scroll zone. Thoughts extend
  // underneath the scroll zone, and text there is tappable like any other: the zone only excludes gestures and
  // scrolls the thoughtspace, so a tap on a word underneath it places the cursor in that thought.
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

  await waitForCursor(LOREM).catch(async () => {
    throw new Error(`Tapping the thought underneath the scroll zone left the cursor on "${await getEditingText()}".`)
  })
})

it('disallows horizontal panning on a thought', async () => {
  await paste(`- ${LOREM}`)
  await waitForEditable(LOREM)

  // Chrome Android's swipe-to-move-cursor rides on a horizontal pan that begins on an editable and drags the
  // caret of whichever thought is focused, raising the magnifier (#4272). Headless Chrome implements neither the
  // gesture nor the magnifier, so the test asserts the declaration that keeps the browser from recognizing that
  // pan in the first place, which only a real browser resolves from the editable recipe.
  const touchAction = await page.evaluate(value => {
    const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
      element => element.innerHTML === value,
    )
    if (!editable) throw new Error(`Thought "${value}" is not rendered.`)
    return getComputedStyle(editable).touchAction
  }, LOREM)

  expect(touchAction).toBe('pan-y')
})
