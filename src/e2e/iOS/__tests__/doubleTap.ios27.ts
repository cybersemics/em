/**
 * IOS Safari double tap tests. Runs on iOS 27, whose WebKit withholds touchend after a double tap.
 * Uses WDIO test runner with Mocha framework.
 */
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../../constants'
import gestures from '../../../test-helpers/gestures'
import gesture from '../helpers/gesture'
import getCaretOffset from '../helpers/getCaretOffset'
import getEditingText from '../helpers/getEditingText'
import getScreenOffsetY from '../helpers/getScreenOffsetY'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
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

  // https://github.com/cybersemics/em/issues/5761
  it('a tap on another thought after a double tap places the caret where it lands', async () => {
    await newThought('hello')
    await newThought('world')
    const world = await waitForEditable('world')
    await tap(world, { offset: 'world'.length, pointerType: 'touch', count: 2 })

    const hello = await waitForEditable('hello')
    await tap(hello, { offset: 'hello'.length, pointerType: 'touch' })
    await waitUntil(async () => (await getEditingText()) === 'hello')

    expect(await getCaretOffset()).toBe('hello'.length)
  })

  // https://github.com/cybersemics/em/issues/5660
  it('a gesture that starts just below the caret after a double tap on the caret runs its command', async () => {
    await newThought('One')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    // a touch on the thought is covered for a moment after each tap on it, to catch the second tap of a double tap
    await browser.pause(1000)
    // if the double tap selected the word, BrowserStack leaves it selected, and a gesture is not run over a selection
    await setSelection('One'.length, 'One'.length)

    const caret = await browser.execute(() => {
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: Math.round(rect.x), bottom: Math.round(rect.bottom) }
    })
    // below the editable, so em does not treat it as a press on the caret, but well inside WebKit's 44pt zone around it
    await gesture(gestures.newSubThought, {
      xStart: caret.x,
      yStart: caret.bottom + 15 + (await getScreenOffsetY()),
      segmentLength: 80,
    })

    const thoughtCount = await browser.execute(() => document.querySelectorAll('[data-editable]').length)
    expect(thoughtCount).toBe(2)
  })
})
