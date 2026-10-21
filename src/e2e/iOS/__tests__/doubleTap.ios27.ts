/**
 * IOS Safari double tap tests. Runs on iOS 27, whose WebKit withholds touchend after a double tap.
 * Uses WDIO test runner with Mocha framework.
 */
import { TIMEOUT_LONG_PRESS_THOUGHT } from '../../../constants'
import getScreenOffsetY from '../helpers/getScreenOffsetY'
import getSelection from '../helpers/getSelection'
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

  // https://github.com/cybersemics/em/issues/5895
  it('a long press near the caret after a double tap does not leave drag and drop active', async () => {
    await newThought('One two')
    await hideKeyboardByTappingDone()
    const editable = await waitForEditable('One two')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'One')
    await setSelection('One two'.length, 'One two'.length)
    // em withholds the long press handlers while a word is selected, and learns that it is not on a throttle
    await waitUntil(() => browser.$('[data-editing=true] [aria-label="thought"][draggable=true]').isExisting())

    const caret = await browser.execute(() => {
      const rect = document.getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: rect.x, y: rect.y + rect.height / 2 }
    })
    // on the text, within WebKit's 44pt around the caret but outside the caret's own touch target
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: Math.round(caret.x - 25),
            y: Math.round(caret.y + (await getScreenOffsetY())),
            origin: 'viewport',
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: TIMEOUT_LONG_PRESS_THOUGHT * 3 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])

    // where the touchend arrives, the alert fades out after the lift
    await browser.waitUntil(
      async () =>
        (await browser.execute(() => document.querySelector('[data-testid="alert-content"]')?.textContent ?? null)) !==
        'Drag and drop to move thought',
      { timeout: 3000, timeoutMsg: 'Drag and drop was still active 3s after the finger lifted.' },
    )
  })
})
