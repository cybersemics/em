/**
 * iOS Safari isolated-primitive diagnostic for #4394 (hypothesis H2).
 *
 * H2: On iOS Safari, `preventDefault()` on the synthesized/touch-adjustment-redirected `mousedown` does
 * NOT prevent the editable from receiving focus, because focus is a default action of the *touch*
 * sequence rather than the mouse event. useEditMode's `else` branch already calls `e.preventDefault()`
 * on mousedown (and `e.defaultPrevented` is observably `true`), yet the keyboard still opens.
 *
 * This spec strips away all em code: it replaces the document with a bare contentEditable plus an
 * adjacent non-focusable overlay (mimicking the thought-annotation), wires `mousedown -> preventDefault`
 * on the editable, and replays the exact finger-sized right-edge tap from caretFocus.ts. If the editable
 * focuses / the keyboard opens here — with zero em code involved — the behavior is a pure iOS Safari
 * platform property, confirming H2.
 *
 * Pinned to iOS 18 (see wdio.browserstack.conf.ts) because the touch-adjustment heuristic that redirects
 * the mouse events onto the editable only reproduces there.
 */
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'

describe('Caret (isolated)', () => {
  it('H2: mousedown preventDefault does not block focus on a touch-redirected edge tap', async () => {
    // Replace the em app with a minimal fixture: a bare contentEditable and an adjacent non-focusable
    // overlay positioned just past its right edge (the role the thought-annotation plays in the app).
    // The editable's mousedown handler unconditionally preventDefaults - exactly the condition of
    // useEditMode's `else` branch - and records whether the default was actually prevented. A focus
    // probe records whether the editable received focus.
    await browser.execute(() => {
      const w = window as unknown as { __fixFocused?: boolean; __fixMousedownPrevented?: boolean | null }
      document.body.innerHTML = ''
      w.__fixFocused = false
      w.__fixMousedownPrevented = null

      const wrap = document.createElement('div')
      wrap.style.cssText = 'position:absolute; top:250px; left:40px;'

      const editable = document.createElement('div')
      editable.id = 'fixEditable'
      editable.setAttribute('contenteditable', 'true')
      editable.textContent = 'Hello'
      editable.style.cssText = 'display:inline-block; font-size:24px; line-height:1.5; outline:none;'

      // Non-focusable overlay just past the editable's right edge. Sits above the editable so the
      // touchstart/touchend land on it (as the thought-annotation does), while Safari's touch
      // adjustment may still redirect the synthesized mousedown onto the editable.
      const overlay = document.createElement('span')
      overlay.id = 'fixOverlay'
      overlay.style.cssText = 'position:absolute; top:0; left:100%; width:44px; height:100%; z-index:5;'

      editable.addEventListener('mousedown', e => {
        e.preventDefault()
        w.__fixMousedownPrevented = e.defaultPrevented
      })
      editable.addEventListener('focus', () => {
        w.__fixFocused = true
      })

      wrap.appendChild(editable)
      wrap.appendChild(overlay)
      document.body.appendChild(wrap)
    })

    const editableEl = await browser.$('#fixEditable').getElement()
    const rect = await getElementRectByScreen(editableEl)

    const webviewContext = (await browser.getContext()) as string

    // Prime with a real native tap on the editable's center + keyboard dismissal. This mirrors
    // caretFocus.ts: it warms the timing race so the synthetic edge-touch below reliably triggers the
    // iOS Safari touch-adjustment retargeting that a real finger would trigger on its own.
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

    // Reset the focus probe so it reflects only the decisive edge tap below.
    await browser.execute(() => {
      ;(window as unknown as { __fixFocused?: boolean }).__fixFocused = false
    })

    // Tap just past the right edge of the editable, vertically centered, with a finger-sized contact
    // area (width/height/pressure). On iOS Safari the touch-adjustment heuristic uses the contact
    // radius to retarget the synthesized mouse events onto the nearby editable, while the
    // touchstart/touchend land on the overlay - so the editable's mousedown fires and preventDefaults,
    // but focus (a touch default action) proceeds anyway. This is the isolated form of #4394.
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

    const prevented = await browser.execute(
      () => (window as unknown as { __fixMousedownPrevented?: boolean | null }).__fixMousedownPrevented === true,
    )
    const focused = await browser.execute(() => (window as unknown as { __fixFocused?: boolean }).__fixFocused === true)
    const keyboard = await isKeyboardShown()

    // The mousedown default was successfully prevented...
    expect(prevented).toBe(true)
    // ...yet the editable focused and the keyboard opened anyway, with zero em code involved.
    // If both are true, H2 is confirmed: mousedown preventDefault cannot block iOS Safari touch focus.
    expect(focused).toBe(true)
    expect(keyboard).toBe(true)
  })
})
