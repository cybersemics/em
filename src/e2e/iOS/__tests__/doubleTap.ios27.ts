/**
 * IOS Safari double tap tests. Runs on iOS 27, whose WebKit withholds touchend after a double tap.
 * Uses WDIO test runner with Mocha framework.
 */
import gestures from '../../../test-helpers/gestures'
import gesture from '../helpers/gesture'
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
