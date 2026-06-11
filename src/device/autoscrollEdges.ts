import store from '../stores/app'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Computed top/bottom edges (in viewport coordinates) that scrollCursorIntoView uses to decide whether to scroll. The "comfort zone" is between topEdge and bottomEdge. The buffer is the same distance applied at both edges — a thought entering within `buffer` px of the visible area triggers scrolling. */
export interface AutoscrollEdges {
  /** Top of the visible area below the toolbar, in viewport coords. */
  toolbarBottom: number
  /** Height of the navbar at the bottom of the visible area. */
  navbarHeight: number
  /** Effective keyboard inset in px. Accounts for both visualViewport shrink (web Safari) and `virtualKeyboardStore.height` (iOS Capacitor). 0 when keyboard is closed. */
  keyboardInset: number
  /** Px of buffer applied at both top and bottom (~2 line-heights). */
  buffer: number
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
  const buffer = fontSize * 2

  const topEdge = toolbarBottom + buffer
  const bottomEdge = window.innerHeight - keyboardInset - navbarHeight - buffer

  return {
    toolbarBottom,
    navbarHeight,
    keyboardInset,
    buffer,
    topEdge,
    bottomEdge,
  }
}

/** LayoutTreeTop fallback for scrollCursorIntoView when the cursor element's offsetParent can't be read from the DOM. */
export const getLayoutTreeTop = () => viewportStore.getState().layoutTreeTop
