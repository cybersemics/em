/** Native iOS gesture regression tests. */
import gestures from '../../../test-helpers/gestures'
import $ from '../helpers/$'
import gesture from '../helpers/gesture'
import getSelection from '../helpers/getSelection'
import getSelectionEndHandlePosition from '../helpers/getSelectionEndHandlePosition'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'

/** Pixels the Safari chrome offsets the page by: `getBoundingClientRect` reports page coordinates while
 * `performActions` delivers touches in screen coordinates. This is the same offset that `tap` callers pass, measured
 * here as 59px on an iPhone 15 Plus. */
const SAFARI_CHROME_OFFSET_Y = 60

/**
 * Get the screen coordinates of the caret, ready to be passed to `gesture` or `performActions`.
 *
 * A caret is a zero-width rect roughly one line tall inside an editable barely taller than it, so unlike a tap on a
 * whole element this has no slack: a touch that misses by more than a few pixels lands outside the thought entirely.
 */
const getCaretPosition = async (): Promise<{ x: number; y: number }> => {
  const raw = await browser.execute(() => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return ''

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    return rect.height ? JSON.stringify({ x: rect.x, y: rect.y, height: rect.height }) : ''
  })
  if (!raw) throw new Error('Caret rect not found. Is the caret in a text node?')

  const rect = JSON.parse(raw) as { x: number; y: number; height: number }
  return { x: Math.round(rect.x), y: Math.round(rect.y + rect.height / 2 + SAFARI_CHROME_OFFSET_Y) }
}

/** Counts the thoughts rendered in the thoughtspace. */
const thoughtCount = () => browser.execute(() => document.querySelectorAll('[data-editable]').length)

describe('Gestures', () => {
  // https://github.com/cybersemics/em/issues/4521
  it('keeps native text selection active without opening the gesture menu when dragging an end handle', async () => {
    const text = 'one two three four five six seven eight nine ten'
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(0, 3)).toMatchObject({ text: 'one', type: 'Range' })

    const handle = await getSelectionEndHandlePosition()
    await gesture('d', { segmentLength: 90, waitMs: 600, xStart: handle.x, yStart: handle.y })

    // This runs after the touch is released, so it can only catch a gesture menu that is stuck open
    // (the #3887 failure mode) — a menu that flashed during the drag is already gone by now.
    const gestureMenu = await $('[data-testid=popup-value]')
    expect(await gestureMenu.isExisting()).toBe(false)

    // This is the assertion that detects the regression: on the pre-fix code the hijacked handle
    // drag collapses the selection to '', while the menu check above still passes.
    expect(await getSelection().toString()).toContain('one two')
  })

  // https://github.com/cybersemics/em/issues/3763
  it('does not run a command when a gesture starts on the caret', async () => {
    const text = 'one two three four five six seven eight'
    // newThought runs this same gesture away from the caret, so the test cannot reach its assertion
    // unless the gesture works here
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(12, 12)).toMatchObject({ type: 'Caret' })

    const caret = await getCaretPosition()
    await gesture(gestures.newThought, { xStart: caret.x, yStart: caret.y })

    // A press on the caret belongs to the magnifier, so the swipe must not be read as New Thought.
    expect(await thoughtCount()).toBe(1)
  })
})
