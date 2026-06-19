import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** The trigger edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to autoscroll.
 * Between topEdge and bottomEdge is the comfort zone: a cursor inside it never triggers a scroll; a cursor
 * crossing either edge does. The bottom edge may be inset from the visible area by a trigger buffer so
 * that scrolling starts before the cursor reaches the navbar. The trigger buffer decides when a scroll
 * starts; where the cursor settles afterwards is the landing margin in scrollCursorIntoView. */
export interface AutoscrollEdges {
  /** Bottom of the toolbar — the top of the visible area, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Height of the virtual keyboard in px. 0 when closed. */
  keyboardInset: number
  /** Trigger buffer that insets bottomEdge above the keyboard/navbar. 0 while the keyboard is open — see getAutoscrollEdges. */
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

  // Use the keyboard's target height — where it will be once its animation settles — rather than
  // the spring-animated `height`. The edges are end-state math: the scroll they trigger is itself
  // animated, so what matters is where the cursor sits relative to the keyboard's final position,
  // not its mid-slide position. On platforms without a virtual keyboard, like desktop, the store
  // stays closed with targetHeight 0, so no inset gets applied.
  const { targetHeight: keyboardInset, open: keyboardOpen } = virtualKeyboardStore.getState()

  const fontSize = store.getState().fontSize

  // No bottom trigger buffer while the keyboard is open: the edge sits right at the keyboard,
  // leaving just enough room for one line of text above it.
  const bottomBuffer = keyboardOpen ? 0 : fontSize * 2

  // No top trigger buffer at all: trigger only once the cursor actually passes under the toolbar, and let
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
