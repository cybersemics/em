import { isSafari, isTouch } from '../browser'
import { getAutoscrollEdges, getLayoutTreeTop } from '../device/autoscrollEdges'

/** Scrolls the minimum amount necessary to move the viewport so that it includes the cursor. */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  const { topEdge, bottomEdge } = getAutoscrollEdges()

  // Landing margin — how far inside the trigger edge the cursor settles after a scroll fires.
  // Independent from the trigger buffer in autoscrollEdges: the cursor begins scrolling once it
  // crosses the edge, but settles `scrollMargin` px inside it so it doesn't sit flush against the
  // toolbar/keyboard.
  //
  // Half the cursor height, not a fixed fontSize multiple. The per-keystroke autoscroll rhythm
  // (each Enter at the bottom of the screen triggers a small scroll, like iOS native) holds iff
  // the landing margin is smaller than one line step: land half a line inside the edge and the
  // next Enter always crosses it again. A fixed fontSize-based margin can equal or exceed the
  // line step, absorbing Enters and then scrolling too far. height/2 also scales the landing
  // position with multi-line thoughts, matching the dynamic feel of iOS native autoscroll.
  const scrollMargin = height / 2

  // Target viewport y of the cursor.
  //
  // Sources we *don't* use, and why:
  //   - `cursorEl.getBoundingClientRect().top` — the cursor-overlay-tree-node has a CSS transition
  //     on `top`, so the rect returns the mid-flight animating value, not the target. Reading it
  //     would make the trigger see "where the cursor used to be" right after every cursor change.
  //   - `viewportStore.layoutTreeTop + y − scrollY` — `layoutTreeTop` is set in a useEffect and is
  //     one frame behind autocrop changes, so this disagrees with the live layout-tree position
  //     during cursor moves that change autocrop.
  //
  // What we *do* use: the cursor element's offsetParent (the inner layout-tree div with the
  // translateX transform) has its position updated synchronously when autocrop changes — no CSS
  // transition, no stale store value. Its live `rect.top` plus the `y` arg (the post-render target
  // the cursor's inline `top` style is being transitioned toward) gives the target viewport y.
  const cursorEl = document.querySelector('[aria-label="cursor-overlay-tree-node"]')
  const offsetParent = cursorEl instanceof HTMLElement ? cursorEl.offsetParent : null
  const offsetParentTop = offsetParent ? offsetParent.getBoundingClientRect().top : null

  /** The y position of the cursor relative to the viewport. */
  const yViewport = offsetParentTop != null ? offsetParentTop + y : getLayoutTreeTop() + y - window.scrollY

  /** The y position of the cursor relative to the document. */
  const yDocument = yViewport + window.scrollY

  const isAboveViewport = yViewport < topEdge
  const isBelowViewport = yViewport + height > bottomEdge

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves.
  // Land the cursor `scrollMargin` px inside the trigger edge so it sits in the comfort zone, not flush with the edge.
  const scrollYNew = isAboveViewport
    ? yDocument - topEdge - scrollMargin
    : yDocument + height - bottomEdge + scrollMargin

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight
  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const behavior: ScrollBehavior = scrollDistance < visualViewportHeight ? 'smooth' : 'auto'

  window.scrollTo({
    top,
    behavior: navigator.webdriver ? 'instant' : behavior,
  })
}

/** Scrolls the cursor into view if needed. */
const scrollCursorIntoView = (y: number, height: number) => {
  // bump scroll on Mobile Safari
  // otherwise Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  if (window.scrollY === 0 && isTouch && isSafari()) {
    window.scrollBy(0, 1)
  }

  scrollIntoViewIfNeeded(y, height)
}

export default scrollCursorIntoView
