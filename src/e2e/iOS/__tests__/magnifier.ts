/**
 * IOS Safari text magnifier (loupe) tests.
 * Uses WDIO test runner with Mocha framework.
 */
import type { Element } from 'webdriverio'
import getSelection from '../helpers/getSelection'
import getTextOffsetCoordinates from '../helpers/getTextOffsetCoordinates.js'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

/** Milliseconds to hold the press before iOS raises the text magnifier. */
const MAGNIFIER_HOLD_MS = 1000

/** Pixels moved per drag increment. IOS tracks the magnifier from a continuous drag, so the movement is delivered in
 * small steps rather than as a single jump. */
const DRAG_STEP_PX = 15

/** Milliseconds each drag increment takes. */
const DRAG_STEP_MS = 150

interface Options {
  /** Character offset within the element's text to press on. Defaults to the horizontal center of the element. */
  offset?: number
  /** Pixels of y offset to add to the touch coordinates. Defaults to the Safari chrome offset used throughout this
   * suite, since element rects are read in page coordinates but touches are delivered in screen coordinates. */
  y?: number
}

/**
 * Presses and holds on a character within a thought until iOS raises the text magnifier, then drags horizontally to
 * move the caret — what a person does to position the caret precisely.
 *
 * PerformActions is used directly because XCUITest does not implement the releaseActions endpoint that
 * action().perform() calls afterwards.
 *
 * @param dx Horizontal distance to drag, in pixels. Negative drags left.
 */
const dragMagnifier = async (nodeHandle: Element, dx: number, { offset, y = 60 }: Options = {}) => {
  const elementId = nodeHandle.elementId
  if (!elementId) throw new Error('Element does not have an elementId.')

  const boundingBox = await browser.getElementRect(elementId)
  if (!boundingBox) throw new Error('Bounding box of element not found.')

  const coordinate =
    offset == null
      ? { x: boundingBox.x + boundingBox.width / 2, y: boundingBox.y + boundingBox.height / 2 }
      : await getTextOffsetCoordinates(nodeHandle, offset)

  if (!coordinate) throw new Error('Coordinate not found.')

  const steps = Math.max(1, Math.round(Math.abs(dx) / DRAG_STEP_PX))
  const step = dx / steps

  console.info(`Dragging magnifier from {x: ${coordinate.x}, y: ${coordinate.y + y}} by ${dx}px in ${steps} steps`)

  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        {
          type: 'pointerMove',
          duration: 0,
          origin: 'viewport',
          x: Math.round(coordinate.x),
          y: Math.round(coordinate.y + y),
        },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: MAGNIFIER_HOLD_MS },
        ...Array.from({ length: steps }, () => [
          {
            type: 'pointerMove' as const,
            duration: DRAG_STEP_MS,
            origin: 'pointer' as const,
            x: Math.round(step),
            y: 0,
          },
          { type: 'pause' as const, duration: 50 },
        ]).flat(),
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

describe('Magnifier', () => {
  // https://github.com/cybersemics/em/issues/3763
  it('dragging the magnifier moves the caret instead of dragging the thought', async () => {
    const value = 'the quick brown fox'
    await newThought(value)
    const editable = await waitForEditable(value)
    await waitUntil(isKeyboardShown)

    // place the caret in the middle of the text, where a person reaches for the magnifier
    await tap(editable, { offset: 10, y: 60, pointerType: 'touch' })
    expect(await getSelection().focusNode?.textContent).toBe(value)
    const offsetBefore = await getSelection().focusOffset

    await dragMagnifier(editable, 60, { offset: 10 })

    // The caret follows the magnifier through the text. Starting a thought drag instead turns off contentEditable
    // mid-drag, which destroys the selection and leaves the caret at the beginning.
    const offsetAfter = await getSelection().focusOffset
    console.info('magnifier drag', { offsetBefore, offsetAfter })
    expect(await getSelection().focusNode?.textContent).toBe(value)
    expect(offsetAfter).toBeGreaterThan(offsetBefore!)
  })
})
