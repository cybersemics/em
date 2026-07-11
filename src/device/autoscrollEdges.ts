import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** The comfort-zone edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to
 * autoscroll. Between topEdge and bottomEdge is the comfort zone: a cursor inside it never triggers a
 * scroll; a cursor crossing either edge does. Each edge is inset from its occluder (toolbar /
 * keyboard+navbar) by a trigger buffer, so a scroll starts a buffer's width *before* the cursor would
 * actually be hidden.
 *
 * The edge is the single reference line for both halves of the behaviour: scrollCursorIntoView triggers
 * when the cursor crosses an edge, and lands it a landingMargin back inside that same edge. So the buffer
 * governs both — when a scroll fires *and*, because the landing is measured from the edge, how deep the
 * cursor settles (it comes to rest buffer + landingMargin inside the visible area). Moving the buffer
 * moves both together; that coupling is deliberate. */
export interface AutoscrollEdges {
  /** Bottom of the toolbar — the top of the visible area, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Height of the virtual keyboard in px. 0 when closed. */
  keyboardInset: number
  /** Trigger buffer that insets topEdge below the toolbar — see getAutoscrollEdges. */
  topBuffer: number
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

  // Top trigger buffer, mirroring bottomBuffer: inset topEdge ~one thought below the toolbar so a
  // scroll fires before the cursor slips fully under it. Without this buffer the cursor has to pass
  // entirely under the toolbar before anything happens, which makes scrolling upward (cursorUp /
  // arrow-up) feel sticky. Constant regardless of keyboard state, since the toolbar — unlike the
  // keyboard — does not move.
  // Because the landing is measured from the edge (see scrollCursorIntoView), this buffer also sets
  // how deep the cursor parks: a bigger buffer fires the scroll earlier *and* lands the cursor lower.
  // Tune fontSize * 2, or set to 0 to trigger flush with the toolbar and land on the landing margin alone.
  const topBuffer = fontSize * 2

  const topEdge = toolbarBottom + topBuffer
  const bottomEdge = window.innerHeight - keyboardInset - navbarHeight - bottomBuffer

  return {
    toolbarBottom,
    navbarHeight,
    keyboardInset,
    topBuffer,
    bottomBuffer,
    topEdge,
    bottomEdge,
  }
}

/** The y position of the layout tree relative to the document, from the viewport store. Fallback for scrollCursorIntoView when the cursor element's offsetParent cannot be read from the DOM. */
export const getLayoutTreeTop = () => viewportStore.getState().layoutTreeTop
