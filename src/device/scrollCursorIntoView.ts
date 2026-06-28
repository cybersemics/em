import { isCapacitor, isIOS, isSafari, isTouch } from '../browser'
import { PREVENT_AUTOSCROLL_TIMEOUT, isPreventAutoscrollInProgress } from '../device/preventAutoscroll'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import viewportStore from '../stores/viewport'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

/** Height in CSS pixels of the iOS QuickType predictive/suggestion bar that sits above the keyboard.
 * The native keyboardHeight reported by the Capacitor Keyboard plugin does not include this bar, so it must be
 * added to the keyboard obstruction to keep the cursor above the suggestion bar rather than behind it. It is a
 * near-constant in logical pixels across iPhone models (#4326). */
const IOS_SUGGESTION_BAR_HEIGHT = 45

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
  const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight

  // On iOS Capacitor the Keyboard plugin is configured with resize: 'none', so the WebView stays full-screen
  // and window.visualViewport.height does NOT shrink when the keyboard opens. We therefore derive the effective
  // viewport height (the area not covered by the keyboard) from the viewport store, whose virtualKeyboardHeight
  // is set reliably by the native keyboard handler. On all other platforms visualViewport.height is correct. (#4326)
  //
  // iOSCapacitorHandler normalizes virtualKeyboardHeight by subtracting the safe-area-bottom inset, because element
  // positioning elsewhere always re-adds that inset. scrollCursorIntoView, however, works in raw viewport coordinates
  // (getBoundingClientRect / window.scrollY) and adds no inset, so we must add the safe-area-bottom back to recover the
  // keyboard's true height. The raw keyboard height also includes the QuickType predictive/suggestion bar, so this keeps
  // the cursor above the suggestion bar rather than behind it. (#4326)
  const isIOSCapacitor = isIOS && isCapacitor()
  const keyboardOpen = virtualKeyboardStore.getState().open
  const rawKeyboardHeight = viewport.virtualKeyboardHeight + getSafeAreaBottom()
  const effectiveViewportHeight =
    isIOSCapacitor && keyboardOpen ? viewport.innerHeight - rawKeyboardHeight : visualViewportHeight

  /** The y position of the element relative to the document. */
  const yDocument = viewport.layoutTreeTop + y

  /** The y position of the element relative to the viewport. */
  const yViewport = yDocument - window.scrollY

  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const toolbarBottom = toolbarRect ? toolbarRect.bottom : 0
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()

  // The y position (in viewport coordinates) below which content is obstructed.
  // On iOS Capacitor with the keyboard open, the obstruction is the keyboard plus the QuickType suggestion bar that
  // sits above it; the bottom navbar is hidden behind the keyboard, so it is not subtracted. On all other platforms
  // the obstruction is the bottom navbar within the (already keyboard-aware) visual viewport. (#4326)
  const bottomBoundary =
    isIOSCapacitor && keyboardOpen
      ? viewport.innerHeight - rawKeyboardHeight - IOS_SUGGESTION_BAR_HEIGHT
      : effectiveViewportHeight - (navbarRect?.height ?? 0)

  const isAboveViewport = yViewport < toolbarBottom
  const isBelowViewport = yViewport + height > bottomBoundary

  if (!isAboveViewport && !isBelowViewport) return

  // The native el.scrollIntoView causes a bug where the top part of the content is cut off, even when a significant delay is added.
  // Therefore, we need to calculate the scroll position ourselves

  // leave a margin between the element and the viewport edge equal to half the element's height
  // add offset to account for the navbar height and prevent scrolled to elements from being hidden below
  // When scrolling an element above the viewport into view, target a position just below the toolbar.
  // The toolbar is offset from the top of the WebView by the safe-area inset on iOS Capacitor, so we must use
  // toolbarBottom (which includes the inset) rather than the toolbar height; otherwise the element is scrolled
  // behind the toolbar, which causes the cursor to be pinned near the top and the list to scroll up repeatedly. (#4326)
  const aboveOffset = isIOSCapacitor ? toolbarBottom : (toolbarRect?.height ?? 0)
  const scrollYNew = isAboveViewport ? yDocument - aboveOffset - height / 2 : yDocument - bottomBoundary + height * 1.5

  // scroll to 1 instead of 0
  // otherwise Mobile Safari scrolls to the top after MultiGesture
  // See: touchmove in MultiGesture.tsx
  const top = Math.max(1, scrollYNew)

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
