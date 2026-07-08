/**
 * IOS Safari isolated-primitive diagnostics for #4394.
 *
 * These specs strip away all em code and reproduce the bug against DOM primitives using a bare
 * contentEditable plus an adjacent non-focusable overlay that mimics the thought-annotation, driven by the
 * exact finger-sized right-edge tap from the caretFocus spec. The touch-adjustment heuristic that redirects
 * the synthesized mouse events onto the editable reproduces on both iOS 17 and iOS 18; this diagnostic runs
 * on a single iOS 18 device (see `wdio.browserstack.conf.ts`) to avoid a redundant duplicate run.
 *
 * The root cause of #4394 on the pre-#4371 code is not a platform property of `mousedown`. In
 * `useEditMode.ts`, `offsetRef.current` is assigned when a thought that has the cursor is tapped, but it is
 * never reset back to null. `onMouseUp` then reads that stale offset and calls `setCaretOffset` ->
 * `selection.set`, which focuses the editable and opens the keyboard. So the focus that #4394 complains
 * about is driven programmatically from `onMouseUp` using a stale offset, not by the native focus default
 * of the tap. On the #4394 edge tap the editable's `onMouseDown` runs its else branch and calls
 * `e.preventDefault()`, which does block the native focus default. The keyboard still opens only because
 * the retargeted `mouseup` fires on the editable and the stale-offset `selection.set` focuses it. This is
 * exactly what PR #4371 fixed by deleting `onMouseUp`/`offsetRef` and moving `setCaretOffset` into a
 * guarded `onMouseDown`.
 *
 * Two configurations are probed, both under the identical finger-sized edge tap. The reproduce spec models
 * pre-#4371: the editable's `mousedown` preventDefaults (blocking native focus) and a `mouseup` handler
 * calls `selection.set` using a stale, never-reset offset. Focus and the keyboard proceed anyway, pinning
 * the cause to the stale-offset `onMouseUp` with zero em code. The control spec models post-#4371: the
 * editable's `mousedown` preventDefaults and there is no `mouseup` selection at all. Focus is blocked and
 * the keyboard stays down, confirming that removing the stale-offset `onMouseUp` (what #4371 did) fixes the
 * bug.
 */
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import isKeyboardShown from '../helpers/isKeyboardShown'

/** Probe flags recorded on the window by the injected fixture. */
type FixWindow = {
  __fixFocused?: boolean
  __fixMousedownFired?: boolean
  __fixMousedownPrevented?: boolean | null
  __fixMouseupFired?: boolean
  __fixSelectionSet?: boolean
}

describe('Caret (isolated)', () => {
  /**
   * Replaces the em app with a minimal fixture: a bare contentEditable and an adjacent non-focusable
   * overlay positioned just past its right edge (the role the thought-annotation plays in the app). The
   * editable's mousedown handler unconditionally preventDefaults - exactly the condition of useEditMode's
   * `else` branch - blocking the native focus default and recording whether it fired and was prevented.
   *
   * When staleOffsetMouseup is set, the editable additionally gets a mouseup handler that models the
   * pre-#4371 `onMouseUp`: it reads a stale, never-reset offset and sets the DOM selection inside the
   * editable exactly as `device/selection.set` does (removeAllRanges + addRange, no explicit focus()),
   * which focuses the contentEditable. When it is not set, there is no mouseup selection, modeling the
   * post-#4371 code where `onMouseUp` was removed entirely.
   */
  const injectFixture = (staleOffsetMouseup: boolean) =>
    browser.execute(withMouseup => {
      const w = window as unknown as FixWindow
      document.body.innerHTML = ''
      w.__fixFocused = false
      w.__fixMousedownFired = false
      w.__fixMousedownPrevented = null
      w.__fixMouseupFired = false
      w.__fixSelectionSet = false

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

      // Models useEditMode's `else` branch: preventDefault blocks the native focus default of the tap.
      editable.addEventListener('mousedown', e => {
        e.preventDefault()
        w.__fixMousedownFired = true
        w.__fixMousedownPrevented = e.defaultPrevented
      })
      editable.addEventListener('focus', () => {
        w.__fixFocused = true
      })

      if (withMouseup) {
        // A stale, never-reset offset, standing in for `offsetRef.current` which useEditMode assigns when a
        // cursor thought is tapped and never resets to null.
        const staleOffset = 2

        // Models pre-#4371 `onMouseUp` -> `setCaretOffset` -> `selection.set`: set the DOM selection inside
        // the editable using the stale offset. This focuses the contentEditable even though the mousedown
        // default was prevented, which is the #4394 focus leak.
        editable.addEventListener('mouseup', () => {
          w.__fixMouseupFired = true
          const textNode = editable.firstChild
          if (!textNode) return
          const clamped = Math.min(staleOffset, textNode.textContent?.length ?? 0)
          const range = document.createRange()
          range.setStart(textNode, clamped)
          range.collapse(true)
          const sel = window.getSelection()
          if (!sel) return
          sel.removeAllRanges()
          sel.addRange(range)
          w.__fixSelectionSet = true
        })
      }

      wrap.appendChild(editable)
      wrap.appendChild(overlay)
      document.body.appendChild(wrap)
    }, staleOffsetMouseup)

  /** Performs a native touch tap at the given screen coordinates, optionally with a finger-sized contact area. */
  const nativeTap = async (webviewContext: string, x: number, y: number, finger = false) => {
    const contact = finger ? { width: 40, height: 40, pressure: 0.9 } : {}
    await browser.switchContext('NATIVE_APP')
    try {
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
    } finally {
      // Always return to the webview context so a failure here can't strand the session in NATIVE_APP
      // (where execute/sync is unavailable and would break subsequent tests).
      await browser.switchContext(webviewContext)
    }
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
    // Dismiss the keyboard by blurring the focused editable rather than tapping the native "Done"
    // accessory. A bare contentEditable does not reliably produce em's keyboard toolbar, and blur runs
    // entirely in the webview context (no native switch, no dependency on a Done button).
    await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur())
    await browser.pause(400)
    // Reset only the transient probe flags. The stale offset intentionally persists, mirroring
    // offsetRef.current never being reset in useEditMode.
    await browser.execute(() => {
      const w = window as unknown as FixWindow
      w.__fixFocused = false
      w.__fixMousedownFired = false
      w.__fixMouseupFired = false
      w.__fixSelectionSet = false
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
        mouseupFired: w.__fixMouseupFired === true,
        selectionSet: w.__fixSelectionSet === true,
      }
    })

  /** Performs the finger-sized tap ~4px past the editable's right edge that triggers the #4394 retargeting. */
  const edgeTap = async (webviewContext: string, rect: { x: number; y: number; width: number; height: number }) => {
    await nativeTap(webviewContext, Math.round(rect.x + rect.width + 4), Math.round(rect.y + rect.height / 2), true)
    await browser.pause(600)
  }

  it('reproduce: stale-offset onMouseUp selection focuses the editable despite a prevented mousedown', async () => {
    await injectFixture(true)

    const editableEl = await browser.$('#fixEditable').getElement()
    const rect = await getElementRectByScreen(editableEl)
    const webviewContext = (await browser.getContext()) as string

    await primeAndDismiss(webviewContext, rect)
    await edgeTap(webviewContext, rect)

    const probes = await readProbes()
    const keyboard = await isKeyboardShown()

    // The mousedown fired on the retargeted editable and its native focus default was successfully prevented.
    expect(probes.mousedownFired).toBe(true)
    expect(probes.mousedownPrevented).toBe(true)
    // The retargeted mouseup also fired on the editable and ran the stale-offset selection.set.
    expect(probes.mouseupFired).toBe(true)
    expect(probes.selectionSet).toBe(true)
    // ...yet the editable focused and the keyboard opened anyway - driven by the programmatic selection,
    // not the native tap default. This isolates #4394 to the stale-offset onMouseUp with zero em code.
    expect(probes.focused).toBe(true)
    expect(keyboard).toBe(true)
  })

  it('control: with no onMouseUp selection (post-#4371), the prevented mousedown keeps focus down', async () => {
    await injectFixture(false)

    const editableEl = await browser.$('#fixEditable').getElement()
    const rect = await getElementRectByScreen(editableEl)
    const webviewContext = (await browser.getContext()) as string

    await primeAndDismiss(webviewContext, rect)
    await edgeTap(webviewContext, rect)

    const probes = await readProbes()
    const keyboard = await isKeyboardShown()

    // The same retargeting occurs: the mousedown fires on the editable and is prevented.
    expect(probes.mousedownFired).toBe(true)
    expect(probes.mousedownPrevented).toBe(true)
    // With the stale-offset onMouseUp removed (what #4371 did), nothing focuses the editable...
    expect(probes.selectionSet).toBe(false)
    // ...so focus is blocked and the keyboard stays down.
    expect(probes.focused).toBe(false)
    expect(keyboard).toBe(false)
  })
})
