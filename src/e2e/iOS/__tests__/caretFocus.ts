/**
 * IOS Safari caret focus reproduction for #4394. Tapping ~4px past the right edge of a non-cursor thought
 * incorrectly opens the virtual keyboard. Safari's touch-adjustment heuristic retargets the synthesized
 * mouse cascade onto the nearby editable while the `touchstart`/`touchend` land on the thought-annotation
 * overlay, so the editable's `onTouchEnd` never runs to `preventDefault`. On the pre-#4371 code the
 * retargeted `mouseup` then runs `onMouseUp` with a stale, never-reset `offsetRef.current`, calling
 * `setCaretOffset` -> `selection.set`, which focuses the editable and opens the keyboard even though
 * `onMouseDown` preventDefaulted the native focus. See `caretFocusIsolated.ts` for the isolated-primitive
 * proof. The stale-offset focus path is device- and version-independent, so the bug reproduces on both iOS
 * 17 and iOS 18. The spec runs as part of the default iOS 17 suite (see `wdio.browserstack.conf.ts`) and
 * asserts the keyboard opens.
 */
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Caret', () => {
  it('Keyboard incorrectly opens on the right-edge tap of a non-cursor thought (#4394)', async () => {
    await newThought('Hello')

    const editable = await waitForEditable('Hello')
    await hideKeyboardByTappingDone()
    await browser.pause(800)
    await browser.execute(() => window.scrollTo(0, 0))
    await browser.pause(400)

    const rect = await getElementRectByScreen(editable)

    // Prime with a real native tap on the thought's center + keyboard dismissal. This is required for
    // the synthetic edge-touch below to reliably win the timing race that a real finger triggers on
    // its own (see comment on the tap). A native tap (not a webview element.click()) is used because
    // on real devices only a native touch focuses the editable and opens the keyboard. Priming while
    // "Hello" has the cursor is also what leaves offsetRef.current set (and never reset) on pre-#4371.
    const webviewContext = (await browser.getContext()) as string
    await browser.switchContext('NATIVE_APP')
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            origin: 'viewport',
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 60 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await browser.switchContext(webviewContext)
    await browser.pause(600)
    await hideKeyboardByTappingDone()
    await browser.pause(400)

    // Cursor Back (swipe right) to set the cursor to null, so that "Hello" becomes a non-cursor thought.
    await gesture('r', {
      xStart: rect.x + 5,
      yStart: rect.y + rect.height / 2,
      segmentLength: rect.width,
    })
    await waitUntil(async () => !(await getEditingText()))

    // Tap just past the right edge of the thought text, vertically centered, using a finger-sized
    // contact area (width/height/pressure). Safari's touch-adjustment heuristic uses the contact radius
    // to retarget the synthesized mouse events onto the nearby editable, but the `touchstart`/`touchend`
    // land on the thought-annotation overlay - so the editable's `onTouchEnd` never runs to
    // `preventDefault`. The retargeted `mouseup` then focuses the editable via the stale offset and the
    // virtual keyboard opens. #4394.
    const tapX = Math.round(rect.x + rect.width + 4)
    const tapY = Math.round(rect.y + rect.height / 2)
    await browser.switchContext('NATIVE_APP')
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: tapX,
            y: tapY,
            origin: 'viewport',
            width: 40,
            height: 40,
            pressure: 0.9,
          },
          { type: 'pointerDown', button: 0, width: 40, height: 40, pressure: 0.9 },
          { type: 'pause', duration: 90 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await browser.switchContext(webviewContext)
    await browser.pause(600)

    const keyboard = await isKeyboardShown()

    // The edge tap opens the keyboard on this pre-#4371 branch (the #4394 reproduction). The stale-offset
    // focus path is version-independent, so this holds on both iOS 17 and iOS 18. It will flip to false
    // once focus is correctly prevented for non-cursor thoughts.
    expect(keyboard).toBe(true)
  })
})
