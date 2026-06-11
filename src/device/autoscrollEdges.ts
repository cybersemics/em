import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Computed top/bottom edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to scroll. The "comfort zone" is between topEdge and bottomEdge. A thought entering within the buffer band of either edge triggers scrolling. */
export interface AutoscrollEdges {
  /** Top of the visible area below the toolbar, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Effective keyboard inset in px. Accounts for both visualViewport shrink (web Safari) and `virtualKeyboardStore.height` (iOS Capacitor). 0 when keyboard is closed. */
  keyboardInset: number
  /** Px of buffer applied at the top edge (~2 line-heights). */
  topBuffer: number
  /** Px of buffer applied at the bottom edge. 0 while the keyboard is open — the visible strip is small and an inset trigger edge makes typing-at-the-bottom scrolls feel like they fire early and overshoot (#3765). */
  bottomBuffer: number
  /** Trigger threshold at the top, in viewport coords. */
  topEdge: number
  /** Trigger threshold at the bottom, in viewport coords. */
  bottomEdge: number
}

/** Reads the live DOM + store values needed to compute the autoscroll trigger zones. */
export const getAutoscrollEdges = (): AutoscrollEdges => {
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarHeight = navbarRect?.height ?? 0

  // On web Safari `visualViewport.height` shrinks when the keyboard opens, so
  // `innerHeight - visualViewport.height` is the keyboard inset. On iOS Capacitor the WKWebView
  // keeps `visualViewport.height` at the full innerHeight (the keyboard overlays the page), so we
  // also consult `virtualKeyboardStore.height` which is set by the @capacitor/keyboard handler.
  // Taking the max means whichever source thinks the keyboard is taller wins.
  const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight
  const { height: keyboardAnimatedHeight, open: keyboardOpenStore } = virtualKeyboardStore.getState()
  const keyboardOpen = keyboardOpenStore || store.getState().isKeyboardOpen === true
  const keyboardInset = keyboardOpen ? Math.max(window.innerHeight - visualViewportHeight, keyboardAnimatedHeight) : 0

  const fontSize = store.getState().fontSize
  const topBuffer = fontSize * 2

  // No bottom buffer while the keyboard is open: with the visible strip already small, insetting
  // the trigger edge here (on top of scrollCursorIntoView's landing margin) makes typing at the
  // bottom scroll before the cursor reaches the keyboard and overshoot when it does — which breaks
  // the scroll-per-Enter rhythm that iOS native autoscroll (and main) has. The keyboard inset
  // itself already keeps the cursor above the keyboard.
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

/** LayoutTreeTop fallback for scrollCursorIntoView when the cursor element's offsetParent can't be read from the DOM. */
export const getLayoutTreeTop = () => viewportStore.getState().layoutTreeTop
