/** Native iOS gesture regression tests. */
import gestures from '../../../test-helpers/gestures'
import $ from '../helpers/$'
import gesture from '../helpers/gesture'
import getCaretPosition from '../helpers/getCaretPosition'
import getSelection from '../helpers/getSelection'
import getSelectionEndHandlePosition from '../helpers/getSelectionEndHandlePosition'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'

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
