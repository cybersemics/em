import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** The trigger edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to scroll.
 * Between topEdge and bottomEdge is the comfort zone: a cursor inside it never triggers a scroll; a cursor
 * crossing either edge does. Each edge may be inset from the visible area by a buffer so that scrolling
 * starts before the cursor reaches the toolbar or keyboard. */
export interface AutoscrollEdges {
  /** Bottom of the toolbar — the top of the visible area, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Height of the virtual keyboard in px. 0 when closed. */
  keyboardInset: number
  /** Inset of topEdge below the toolbar (~2 line-heights). */
  topBuffer: number
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

  // The keyboard height is reported differently per platform. On web Safari the keyboard shrinks
  // `visualViewport.height`, so `innerHeight - visualViewport.height` is the keyboard height. On
  // iOS Capacitor the keyboard overlays the page and `visualViewport.height` stays at the full
  // innerHeight, so the height comes from `virtualKeyboardStore` instead (fed by
  // @capacitor/keyboard). Take the max so whichever source sees the keyboard wins.
  //
  // The open flag likewise has two sources: `virtualKeyboardStore.open` (native keyboard events)
  // and `state.isKeyboardOpen` (set by the app when it intends to open the keyboard, e.g.
  // setCursor) — trust either, since one may lead the other during the open animation.
  const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight
  const { height: keyboardAnimatedHeight, open: keyboardOpenStore } = virtualKeyboardStore.getState()
  const keyboardOpen = keyboardOpenStore || store.getState().isKeyboardOpen === true
  const keyboardInset = keyboardOpen ? Math.max(window.innerHeight - visualViewportHeight, keyboardAnimatedHeight) : 0

  const fontSize = store.getState().fontSize
  const topBuffer = fontSize * 2

  // No bottom buffer while the keyboard is open. The keyboard inset alone keeps the cursor above
  // the keyboard, and any extra inset here (stacked on scrollCursorIntoView's landing margin)
  // makes typing at the bottom of the screen scroll early and overshoot — breaking the
  // one-scroll-per-Enter rhythm of iOS native autoscroll (#3765). With the keyboard closed there
  // is room to spare, so keep a comfortable buffer.
  const bottomBuffer = keyboardOpen ? 0 : fontSize * 2

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
