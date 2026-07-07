/**
 * iOS Safari isolated-primitive diagnostics for #4394.
 *
 * These specs strip away all em code and reproduce the bug against DOM primitives: a bare
 * contentEditable plus an adjacent non-focusable overlay (mimicking the thought-annotation), driven by
 * the exact finger-sized right-edge tap from caretFocus.ts. Pinned to iOS 18 (see
 * wdio.browserstack.conf.ts) because the touch-adjustment heuristic that redirects the synthesized
 * mouse events onto the editable only reproduces there.
 *
 * Two hypotheses are probed:
 *
 * - H2 (first spec): `preventDefault()` on the touch-adjustment-redirected `mousedown` does NOT block
 *   focus, because focus is a default action of the *touch* sequence, not the mouse event. Passing this
 *   spec (focus + keyboard despite a successfully-prevented mousedown, with zero em code) confirms H2 is
 *   a pure iOS Safari platform property.
 *
 * - Touch-layer fix viability (second spec): since the touchstart/touchend land on the overlay and never
 *   reach the editable, the only touch we can intercept is the overlay's. This spec preventDefaults on
 *   the overlay's touch events and asks whether that suppresses the retargeted focus. If it does, a
 *   touch-layer fix on the annotation/overlay is viable. If focus still proceeds, iOS's focus retarget is
 *   decoupled from the overlay's touch default and no `preventDefault` can stop it — the fix must prevent
 *   focus another way (e.g. blur-on-focus, or making the editable unfocusable while it is a non-cursor
 *   thought).
 */
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'

/** Probe flags recorded on the window by the injected fixture. */
type FixWindow = {
  __fixFocused?: boolean
  __fixMousedownFired?: boolean
  __fixMousedownPrevented?: boolean | null
  __fixOverlayTouchFired?: boolean
  __fixTouchPrevented?: boolean | null
}

describe('Caret (isolated)', () => {
  /**
   * Replaces the em app with a minimal fixture: a bare contentEditable and an adjacent non-focusable
   * overlay positioned just past its right edge (the role the thought-annotation plays in the app). The
   * editable's mousedown handler unconditionally preventDefaults - exactly the condition of useEditMode's
   * `else` branch - and records whether it fired and whether the default was prevented. A focus probe
   * records whether the editable received focus. When guardOverlayTouch is set, the overlay also
   * preventDefaults its touchstart/touchend (the only touch that actually lands during the edge tap).
   */
  const injectFixture = (guardOverlayTouch: boolean) =>
    browser.execute(guard => {
      const w = window as unknown as FixWindow
      document.body.innerHTML = ''
      w.__fixFocused = false
      w.__fixMousedownFired = false
      w.__fixMousedownPrevented = null
      w.__fixOverlayTouchFired = false
      w.__fixTouchPrevented = null

      const wrap = document.createElement('div')
      wrap.style.cssText = 'position:absolute; top:250px; left:40px;'

      const editable = document.createElement('div')
      editable.id = 'fixEditable'
      editable.setAttribute('contenteditable', 'true')
      editable.textContent = 'Hello'
      editable.style.cssText = 'display:inline-block; font-size:24px; line-height:1.5; outline:none;'

      const overlay = document.createElement('span')
      overlay.id = 'fixOverlay'
      overlay.style.cssText = 'position:absolute; top:0; left:100%; width:44px; height:100%; z-index:5;'

      editable.addEventListener('mousedown', e => {
        e.preventDefault()
        w.__fixMousedownFired = true
        w.__fixMousedownPrevented = e.defaultPrevented
      })
      editable.addEventListener('focus', () => {
        w.__fixFocused = true
      })

      if (guard) {
        // passive:false is required for preventDefault on touchstart to be honored by Safari.
        const onTouch = (e: Event) => {
          e.preventDefault()
          w.__fixOverlayTouchFired = true
          w.__fixTouchPrevented = e.defaultPrevented
        }
        overlay.addEventListener('touchstart', onTouch, { passive: false })
        overlay.addEventListener('touchend', onTouch, { passive: false })
      }

      wrap.appendChild(editable)
      wrap.appendChild(overlay)
      document.body.appendChild(wrap)
    }, guardOverlayTouch)

  /** Performs a native touch tap at the given screen coordinates, optionally with a finger-sized contact area. */
  const nativeTap = async (webviewContext: string, x: number, y: number, finger = false) => {
    const contact = finger ? { width: 40, height: 40, pressure: 0.9 } : {}
    await browser.switchContext('NATIVE_APP')
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y, origin: 'viewport', ...contact },
          { type: 'pointerDown', button: 0, ...contact },
          { type: 'pause', duration: finger ? 90 : 60 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await browser.switchContext(webviewContext)
  }

  /**
   * Prime with a real native tap on the editable's center + keyboard dismissal, then reset the probes.
   * This mirrors caretFocus.ts: it warms the timing race so the synthetic edge-touch reliably triggers
   * the iOS Safari touch-adjustment retargeting that a real finger would trigger on its own.
   */
  const primeAndDismiss = async (
    webviewContext: string,
    rect: { x: number; y: number; width: number; height: number },
  ) => {
    await nativeTap(webviewContext, Math.round(rect.x + rect.width / 2), Math.round(rect.y + rect.height / 2))
    await browser.pause(600)
    await hideKeyboardByTappingDone()
    await browser.pause(400)
    await browser.execute(() => {
      const w = window as unknown as FixWindow
      w.__fixFocused = false
      w.__fixMousedownFired = false
      w.__fixOverlayTouchFired = false
    })
  }

  /** Reads all probe flags in a single round-trip. */
  const readProbes = () =>
    browser.execute(() => {
      const w = window as unknown as FixWindow
      return {
        focused: w.__fixFocused === true,
        mousedownFired: w.__fixMousedownFired === true,
        mousedownPrevented: w.__fixMousedownPrevented === true,
        overlayTouchFired: w.__fixOverlayTouchFired === true,
        touchPrevented: w.__fixTouchPrevented === true,
      }
    })

  it('H2: mousedown preventDefault does not block focus on a touch-redirected edge tap', async () => {
    await injectFixture(false)

    const editableEl = await browser.$('#fixEditable').getElement()
    const rect = await getElementRectByScreen(editableEl)
    const webviewContext = (await browser.getContext()) as string

    await primeAndDismiss(webviewContext, rect)

    // Tap just past the right edge with a finger-sized contact area. Safari's touch adjustment retargets
    // the synthesized mouse events onto the editable while the touchstart/touchend land on the overlay -
    // so the editable's mousedown fires and preventDefaults, but focus proceeds anyway. Isolated #4394.
    await nativeTap(webviewContext, Math.round(rect.x + rect.width + 4), Math.round(rect.y + rect.height / 2), true)
    await browser.pause(600)

    const probes = await readProbes()
    const keyboard = await isKeyboardShown()

    // The mousedown fired and its default was successfully prevented...
    expect(probes.mousedownFired).toBe(true)
    expect(probes.mousedownPrevented).toBe(true)
    // ...yet the editable focused and the keyboard opened anyway, with zero em code involved.
    // If both are true, H2 is confirmed: mousedown preventDefault cannot block iOS Safari touch focus.
    expect(probes.focused).toBe(true)
    expect(keyboard).toBe(true)
  })

  it('control: preventDefault on the overlay touch (the element the touch actually hits) suppresses focus', async () => {
    await injectFixture(true)

    const editableEl = await browser.$('#fixEditable').getElement()
    const rect = await getElementRectByScreen(editableEl)
    const webviewContext = (await browser.getContext()) as string

    await primeAndDismiss(webviewContext, rect)

    // Same edge tap, but now the overlay preventDefaults its own touch events.
    await nativeTap(webviewContext, Math.round(rect.x + rect.width + 4), Math.round(rect.y + rect.height / 2), true)
    await browser.pause(600)

    const probes = await readProbes()
    const keyboard = await isKeyboardShown()

    // The touch landed on the overlay and its default was cancelable and prevented.
    expect(probes.overlayTouchFired).toBe(true)
    expect(probes.touchPrevented).toBe(true)
    // Hypothesis under test: preventing the overlay's touch default suppresses the retargeted focus and
    // the synthesized mouse cascade. If these pass, a touch-layer fix on the annotation/overlay is
    // viable. If focus/keyboard still occur, the fix must prevent focus another way.
    expect(probes.mousedownFired).toBe(false)
    expect(probes.focused).toBe(false)
    expect(keyboard).toBe(false)
  })
})
