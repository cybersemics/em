/** Native iOS gesture regression tests. */
import gestures from '../../../test-helpers/gestures'
import $ from '../helpers/$'
import disableTransitions from '../helpers/disableTransitions'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import getSelectionEndHandlePosition from '../helpers/getSelectionEndHandlePosition'
import holdAndSwipe from '../helpers/holdAndSwipe'
import isKeyboardShown from '../helpers/isKeyboardShown'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitForElement from '../helpers/waitForElement'
import waitUntil from '../helpers/waitUntil'

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

  // https://github.com/cybersemics/em/issues/6313
  it('does not run a command when a gesture starts on the caret in a note', async () => {
    const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'
    // The note slides into place after the paste, and a tap aimed at it mid-slide lands on the parent thought.
    await disableTransitions()
    await paste(`
    - a
      - =note
        - ${text}`)

    const note = await waitForElement('[aria-label="note-editable"]')
    await tap(note, { pointerType: 'touch', offset: 'Lorem ipsum '.length })
    await waitUntil(isKeyboardShown)

    const caret = await getCaretPosition()
    await gesture(gestures.newThought, { xStart: caret.x, yStart: caret.y })

    expect(await thoughtCount()).toBe(1)
  })

  // https://github.com/cybersemics/em/issues/6313
  it.skip('does not run a command when a held press away from the caret drags the caret of a note', async () => {
    const text =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    await disableTransitions()
    await paste(`
    - a
      - =note
        - ${text}`)

    // The caret goes at the end of the note's last line, so the center of the note is well away from it.
    const note = await waitForElement('[aria-label="note-editable"]')
    await tap(note, { pointerType: 'touch', offset: text.length })
    await waitUntil(isKeyboardShown)

    // A press held in the text raises the magnifier wherever it lands, and the drag then moves the caret. Drawn as a
    // gesture, the drag up would be Open Command Center.
    await holdAndSwipe(note, { dy: -60, holdMs: 1000 })

    // the command would have run when the finger lifted, which holdAndSwipe waits for
    expect(
      await browser.execute(() =>
        document.querySelector('[data-testid="command-center-panel"]')?.getAttribute('data-sheet-state'),
      ),
    ).not.toBe('open')
  })

  // https://github.com/cybersemics/em/issues/3763
  it('runs a command when a gesture passes through the caret without starting on it', async () => {
    const text = 'one two three four five six seven eight'
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(12, 12)).toMatchObject({ type: 'Caret' })
    expect(await getEditingText()).toBe(text)

    // Start clear of the caret's zone and swipe right through it. Only the touch that *starts* on the caret belongs to
    // the magnifier; one that merely crosses it is an ordinary gesture.
    const caret = await getCaretPosition()
    await gesture('r', { xStart: caret.x - 40, yStart: caret.y, segmentLength: 80 })

    // Back clears the cursor when the thoughtspace holds a single thought, so no thought is being edited afterwards.
    const cursorCleared = await waitUntil(async () => (await getEditingText()) === undefined)
    expect(cursorCleared).toBeTruthy()
  })
})
