/**
 * IOS Safari touch event delivery tests.
 * Uses WDIO test runner with Mocha framework.
 */
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import openPlainEditable from '../helpers/openPlainEditable'
import recordTouchEvents from '../helpers/recordTouchEvents'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitForTouchesToEnd from '../helpers/waitForTouchesToEnd'
import waitUntil from '../helpers/waitUntil'

describe('Touch', () => {
  // https://github.com/cybersemics/em/issues/5660
  it('a tap on the caret word after double-tapping the caret ends when the finger lifts', async () => {
    await newThought('One')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One')
    await tap(editable, { pointerType: 'touch', y: 60 })
    await waitUntil(isKeyboardShown)

    await tap(editable, { pointerType: 'touch', y: 60, offset: 3, count: 2 })
    await recordTouchEvents()
    await tap(editable, { pointerType: 'touch', y: 60, offset: 2 })

    await waitForTouchesToEnd(1)
  })

  // https://github.com/cybersemics/em/issues/5660
  describe('outside em', () => {
    afterEach(() => browser.back())

    it('a tap on the caret word of a plain contenteditable after double-tapping the caret ends when the finger lifts', async () => {
      const editable = await openPlainEditable('One')
      await tap(editable, { pointerType: 'touch', y: 60, horizontalTapLine: 'right' })
      await waitUntil(isKeyboardShown)

      await tap(editable, { pointerType: 'touch', y: 60, offset: 3, count: 2 })
      await recordTouchEvents()
      await tap(editable, { pointerType: 'touch', y: 60, offset: 2 })

      await waitForTouchesToEnd(1)
    })
  })
})
