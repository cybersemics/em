import { isCapacitor, isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import scrollWindowTo from '../device/scrollWindowTo'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Scrolls the minimum amount necessary to move the viewport so that it includes the element. */
const scrollIntoViewIfNeeded = (y: number, height: number) => {
  // preventAutoscroll works by briefly increasing the element's height, which breaks isElementInViewport.
  // Therefore, we need to wait until preventAutoscroll is done.
  // See: preventAutoscroll.ts
  if (isPreventAutoscrollInProgress()) {
    setTimeout(() => {
      scrollIntoViewIfNeeded(y, height)
    }, PREVENT_AUTOSCROLL_TIMEOUT)
    return
  }

  // determine if the elements is above or below the viewport
  // toolbar element is not present when distractionFreeTyping is activated
  const viewport = viewportStore.getState()

  // window.visualViewport.height excludes the virtual keyboard height (i.e. it changes when the keyboard is open/closed).
  // It changes in a single step (before the virtual keyboard animation completes), so we can use it to determine if the element will be below the visible area.
  // On desktop or when the virtual keyboard is down, it is equivalent to window.innerHeight.
  //
  // Exception: In Capacitor, the native WebView does not shrink window.visualViewport when the virtual keyboard opens
  // (iOS sets Keyboard.resize = 'none'; the Android WebView behaves the same way). visualViewport.height therefore stays
  // equal to the full innerHeight even while the keyboard covers the bottom of the screen, which would cause the cursor
  // to be autoscrolled on every focus change instead of only when it reaches the bottom of the visible area (#3766).
  // Instead, derive the visible height from viewportStore, which tracks the real keyboard height natively (see
  // iOSCapacitorHandler). virtualKeyboardHeight retains its last value when the keyboard is closed, so only subtract it
  // when the keyboard is actually open.
  const keyboardOpen = virtualKeyboardStore.getState().open
  // On iOS Capacitor the keyboard is open: subtract both the keyboard height and the safe-area-bottom
  // inset. iOSCapacitorHandler normalizes virtualKeyboardHeight by subtracting the safe-area inset, so
  // add it back here to recover the keyboard's true top edge (otherwise the cursor lands ~34px too low).
  const onCapacitorKeyboard = isCapacitor() && keyboardOpen
  const visualViewportHeight = isCapacitor()
    ? viewport.innerHeight - (keyboardOpen ? viewport.virtualKeyboardHeight + getSafeAreaBottom() : 0)
    : (window.visualViewport?.height ?? window.innerHeight)

  // Keep the cursor clear of the keyboard (below) and the toolbar (above) rather than flush against
  // them. The keyboard needs more room — it also absorbs the predictive-text (QuickType) bar whose
  // height is not reflected in virtualKeyboardHeight — while the toolbar only needs a line of breathing
  // room. Only when the Capacitor keyboard is open; off Capacitor the original edge behavior is kept.
  const keyboardClearance = onCapacitorKeyboard ? height * 2 : 0
  const toolbarClearance = onCapacitorKeyboard ? height : 0

  /** The y position of the element relative to the document. */
  const yDocument = viewport.layoutTreeTop + y

  /** The y position of the element relative to the viewport. */
  const yViewport = yDocument - window.scrollY

  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()
  const isAboveViewport = yViewport < toolbarBottom + toolbarClearance
  const isBelowViewport = yViewport + height > visualViewportHeight - (navbarRect?.height ?? 0) - keyboardClearance

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  //
  // Above (Capacitor): place the cursor below the toolbar's bottom edge plus the clearance. Using
  // toolbarBottom (not toolbarRect.height) matters on iOS, where the safe-area inset pushes the toolbar
  // down so its height is less than its bottom — offsetting by height would leave the cursor behind the
  // toolbar and re-trigger the scroll on every keystroke. Off Capacitor, keep the original offset.
  const scrollYNew = isAboveViewport
    ? onCapacitorKeyboard
      ? yDocument - toolbarBottom - toolbarClearance - height / 2
      : yDocument - (toolbarRect?.height ?? 0) - height / 2
    : yDocument - visualViewportHeight + height * 1.5 + (navbarRect?.height ?? 0) + keyboardClearance

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

  const scrollDistance = Math.abs(scrollYNew - window.scrollY)
  const behavior: ScrollBehavior = scrollDistance < visualViewportHeight ? 'smooth' : 'auto'

  scrollWindowTo(top, navigator.webdriver ? 'instant' : behavior)
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
