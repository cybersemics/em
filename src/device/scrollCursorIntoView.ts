import { isSafari, isTouch } from '../browser'
import { getAutoscrollEdges, getLayoutTreeTop } from '../device/autoscrollEdges'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/**
 * Scrolls the minimum amount necessary to bring the cursor back inside the comfort zone — the
 * region between the autoscroll trigger edges defined by autoscrollEdges.
 * A cursor inside the comfort zone never scrolls.
 * A cursor that crosses the top edge (under the toolbar) or the bottom edge (at the keyboard/navbar)
 * is scrolled back in, landing a small margin inside the edge it crossed.
 */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  const { topEdge, bottomEdge } = getAutoscrollEdges()

  // Landing margin: how far inside the crossed edge the cursor settles after a scroll, so it
  // doesn't sit flush against the toolbar or keyboard. Distinct from the trigger buffer in
  // autoscrollEdges — the trigger buffer decides when a scroll starts; the landing margin decides
  // where the cursor settles once one has fired.
  const landingMargin = height / 2

  // Find the cursor's *target* viewport y — where it will be once the layout animation settles,
  // not where it is mid-flight. Two moving parts make this non-trivial:
  //   - The cursor overlay glides into place: TreeNodePositioner gives it a CSS transition on
  //     `top`, so right after a cursor change the node is still animating from its old position.
  //   - Autocrop: navigating deeper crops away the space above the cursor by shifting the whole
  //     layout tree up with a translateY transform (see useAutocrop in LayoutTree).
  //
  // The `y` arg is the destination of that `top` transition: the cursor's final position relative
  // to the layout tree, computed by LayoutTree and passed down via BulletCursorOverlay. Adding it
  // to the layout tree's live viewport position — the cursor overlay's offsetParent rect, which
  // reflects autocrop synchronously on render — gives the cursor's final viewport position.
  const cursorEl = document.querySelector('[aria-label="cursor-overlay-tree-node"]')
  const offsetParent = cursorEl instanceof HTMLElement ? cursorEl.offsetParent : null
  const offsetParentTop = offsetParent ? offsetParent.getBoundingClientRect().top : null

  /** The y position of the cursor relative to the viewport. */
  const yViewport = offsetParentTop != null ? offsetParentTop + y : getLayoutTreeTop() + y - window.scrollY

  /** The y position of the cursor relative to the document. */
  const yDocument = yViewport + window.scrollY

  const isAboveTopEdge = yViewport < topEdge
  const isBelowBottomEdge = yViewport + height > bottomEdge

  if (!isAboveTopEdge && !isBelowBottomEdge) return

  // Calculate the scroll position ourselves rather than using the native el.scrollIntoView, which
  // cuts off the top of the content even when a significant delay is added.
  // Scroll just far enough that the cursor lands `landingMargin` px inside the edge it crossed.
  const scrollYNew = isAboveTopEdge
    ? yDocument - topEdge - landingMargin
    : yDocument + height - bottomEdge + landingMargin

  // The top trigger buffer fires as soon as the cursor enters the buffer band below the toolbar,
  // even when the document is already scrolled all the way up and there is nothing above to
  // reveal. In that case scrollYNew computes to an unreachable negative position — scrolling
  // "further up" than 0 is impossible — and flooring it to 1 below would manufacture a 1px scroll
  // out of nothing, shifting the whole page for no visible benefit. Skip the correction rather
  // than let the floor turn a no-op into a scroll.
  if (isAboveTopEdge && scrollYNew <= 0 && window.scrollY === 0) return

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  // Smooth-scroll short distances, but jump instantly when the target is more than a screenful
  // away, where a smooth scroll would be slow and disorienting. "A screenful" is the visible area
  // above the virtual keyboard, from the same store autoscrollEdges uses. (visualViewport.height
  // is not an option: with Capacitor's Keyboard resize: 'none', it never shrinks in the native app.)
  const visibleHeight = window.innerHeight - virtualKeyboardStore.getState().targetHeight
  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const behavior: ScrollBehavior = scrollDistance < visibleHeight ? 'smooth' : 'auto'

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
