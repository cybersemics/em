/**
 * IOS Safari double tap tests. Runs on iOS 27, whose WebKit withholds touchend after a double tap.
 * Uses WDIO test runner with Mocha framework.
 */
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../../constants'
import getSelection from '../helpers/getSelection'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import recordCaretOffsetsFromNextTouch from '../helpers/recordCaretOffsetsFromNextTouch'
import setSelection from '../helpers/setSelection'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Double tap', () => {
  // https://github.com/cybersemics/em/issues/5660
  it('a tap after a double tap on the caret does not activate drag and drop', async () => {
    await newThought('One')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'One')
    // On a device the next tap moves the caret even though iOS withholds its touchend, but on BrowserStack it leaves
    // the word selected, and em does not start a long press while a word is selected.
    await setSelection('One'.length, 'One'.length)

    // clear of the bullet, which overlaps the editable's left edge
    await tap(editable, { horizontalTapLine: 'left', x: 4, pointerType: 'touch' })
    // drag and drop would activate TIMEOUT_LONG_PRESS_THOUGHT after the touch, and stay active until the next one
    await browser.pause(TIMEOUT_LONG_PRESS_THOUGHT * 2)

    const alertText = await browser.execute(
      () => document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
    )
    expect(alertText).toBe(null)
    expect(await isKeyboardShown()).toBe(true)
  })

  // https://github.com/cybersemics/em/pull/5681#issuecomment-6032801965
  it('a tap on an empty thought after a double tap does not activate drag and drop', async () => {
    await newThought('One')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'One')

    await newThought()
    const empty = await browser.$('[data-editing=true] [data-editable]').getElement()
    // the third letter of the placeholder, out of reach of the caret at its start
    await tap(empty, { horizontalTapLine: 'left', x: 25, pointerType: 'touch' })
    // drag and drop would activate TIMEOUT_LONG_PRESS_THOUGHT after the touch, and stay active until the next one
    await browser.pause(TIMEOUT_LONG_PRESS_THOUGHT * 2)

    // the New Thought gesture's alert may still be up
    const alertText = await browser.execute(
      () => document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
    )
    expect(alertText).not.toBe('Drag and drop to move thought')
    expect(await isKeyboardShown()).toBe(true)
  })

  // https://github.com/cybersemics/em/issues/5981
  it('a tap within the thought being edited after a double tap is not undone', async () => {
    await newThought('Existentialism eternally')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('Existentialism eternally')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'Existentialism'.length, pointerType: 'touch' })
    await waitUntil(
      async () => (await browser.execute(() => document.getSelection()?.focusOffset)) === 'Existentialism'.length,
    )
    await tap(editable, { offset: 'Existentialism'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'Existentialism')
    await setSelection('Existentialism'.length, 'Existentialism'.length)

    const caretOffsets = await recordCaretOffsetsFromNextTouch()
    // the middle of "eternally"
    await tap(editable, { offset: 'Existentialism eter'.length, pointerType: 'touch' })
    // iOS places the caret at the tap and moves it back within about 300ms, after which em should put it back again
    const before = 'Existentialism'.length
    /** True once the offsets show the caret leaving, returning to before, and leaving again. */
    const reverted = (offsets: number[]) => {
      const left = offsets.findIndex(offset => offset > before)
      const returned = offsets.findIndex((offset, i) => i > left && offset === before)
      return left !== -1 && returned !== -1 && offsets.slice(returned + 1).some(offset => offset > before)
    }
    try {
      await browser.waitUntil(async () => reverted(await caretOffsets()), { timeout: 3000 })
    } catch {
      throw new Error(
        `Expected the caret to leave offset ${before}, return to it, and leave it again, but it went through ${JSON.stringify(await caretOffsets())}.`,
      )
    }

    const offset = await browser.execute(() => document.getSelection()?.focusOffset ?? null)
    expect(offset).toBeGreaterThanOrEqual('Existentialism '.length)
  })
})
