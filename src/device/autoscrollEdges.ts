import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** The trigger edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to autoscroll.
 * Between topEdge and bottomEdge is the comfort zone: a cursor inside it never triggers a scroll; a cursor
 * crossing either edge does. The bottom edge may be inset from the visible area by a buffer so that
 * scrolling starts before the cursor reaches the navbar. */
export interface AutoscrollEdges {
  /** Bottom of the toolbar — the top of the visible area, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Height of the virtual keyboard in px. 0 when closed. */
  keyboardInset: number
  /** Inset of bottomEdge above the keyboard/navbar. 0 while the keyboard is open — see getAutoscrollEdges. */
  bottomBuffer: number
  /** Crossing above this edge triggers a scroll. */
  topEdge: number
  /** Crossing below this edge triggers a scroll. */
  bottomEdge: number
}

/** Reads the live DOM and store values needed to compute the autoscroll trigger edges. */
export const getAutoscrollEdges = (): AutoscrollEdges => {
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarHeight = navbarRect?.height ?? 0

  // virtualKeyboardStore is the single source of truth for the keyboard. It is fed by
  // platform-specific handlers (see src/device/virtual-keyboard/): native keyboard events on iOS
  // Capacitor, visualViewport measurements on iOS Safari. On platforms with no handler (e.g.
  // desktop) the store stays closed with height 0, so no inset is applied — unlike
  // `state.isKeyboardOpen`, which really means "is editing" and is set on desktop too.
  // `open` stays true through the closing animation while `height` springs to 0, so the edges
  // keep accounting for the keyboard until it has fully closed.
  const { height: keyboardInset, open: keyboardOpen } = virtualKeyboardStore.getState()

  const fontSize = store.getState().fontSize

  // No bottom buffer while the keyboard is open. The keyboard inset alone keeps the cursor above
  // the keyboard, and any extra inset here (stacked on scrollCursorIntoView's landing margin)
  // makes typing at the bottom of the screen scroll early and overshoot — breaking the
  // one-scroll-per-Enter rhythm of iOS native autoscroll (#3765). With the keyboard closed there
  // is room to spare, so keep a comfortable buffer.
  const bottomBuffer = keyboardOpen ? 0 : fontSize * 2

  // No top buffer at all: trigger only once the cursor actually passes under the toolbar, and let
  // scrollCursorIntoView's landing margin (half the cursor height) provide the headroom. An inset
  // trigger edge here scrolls while the cursor is still fully visible and lands it ~2.5 lines deep —
  // each top scroll should instead reveal about one thought, mirroring the bottom edge's
  // one-line-per-Enter rhythm.
  const topEdge = toolbarBottom
  const bottomEdge = window.innerHeight - keyboardInset - navbarHeight - bottomBuffer

  return {
    toolbarBottom,
    navbarHeight,
    keyboardInset,
    bottomBuffer,
    topEdge,
    bottomEdge,
  }
}

/** The y position of the layout tree relative to the document, from the viewport store. Fallback for scrollCursorIntoView when the cursor element's offsetParent cannot be read from the DOM. */
export const getLayoutTreeTop = () => viewportStore.getState().layoutTreeTop
