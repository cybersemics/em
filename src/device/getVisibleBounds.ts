import { isCapacitor, isIOS } from '../browser'
import viewportStore from '../stores/viewportStore'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'
import getSafeAreaBottom from './virtual-keyboard/getSafeAreaBottom'

/** The part of the viewport that content can be seen in, in viewport coordinates: below the toolbar, and above the bottom nav bar or the virtual keyboard. Reads layout, so it belongs to a discrete event such as a cursor change, not to a handler that fires continuously. */
const getVisibleBounds = () => {
  const viewport = viewportStore.getState()

  // window.visualViewport.height excludes the virtual keyboard height (i.e. it changes when the keyboard is open/closed).
  // It changes in a single step (before the virtual keyboard animation completes), so we can use it to determine if the element will be below the visible area.
  // On desktop or when the virtual keyboard is down, it is equivalent to window.innerHeight.
  // After the app switcher's landscape snapshot, iOS can report a visualViewport.height of zero or less for the rest of the session (#5972). Scrolling against it would push the cursor far down the page and pan the visible area below the nav bar, so fall back to innerHeight.
  const visualViewportHeight =
    window.visualViewport && window.visualViewport.height > 0 ? window.visualViewport.height : window.innerHeight

  // On iOS Capacitor the Keyboard plugin is configured with resize: 'none', so the WebView stays full-screen
  // and window.visualViewport.height does NOT shrink when the keyboard opens. We therefore derive the effective
  // viewport height (the area not covered by the keyboard) from the viewport store, whose virtualKeyboardHeight
  // is set reliably by the native keyboard handler. On all other platforms visualViewport.height is correct. (#4326)
  //
  // iOSCapacitorHandler normalizes virtualKeyboardHeight by subtracting the safe-area-bottom inset, because element
  // positioning elsewhere always re-adds that inset. The visible bounds, however, are in raw viewport coordinates
  // (getBoundingClientRect / window.scrollY) and add no inset, so we must add the safe-area-bottom back to recover the
  // keyboard's true height.
  //
  // That raw height is UIKeyboardFrameEndUserInfoKey reported verbatim by the Capacitor Keyboard plugin, i.e. the whole
  // input view including the QuickType predictive/suggestion bar. No separate allowance for the bar is needed, and none
  // should be added: the reported height already shrinks by the bar's height when the user turns off
  // Settings > General > Keyboard > Predictive. (#4326)
  const isIOSCapacitor = isIOS && isCapacitor()
  const keyboardOpen = virtualKeyboardStore.getState().open
  const rawKeyboardHeight = viewport.virtualKeyboardHeight + getSafeAreaBottom()
  const effectiveViewportHeight =
    isIOSCapacitor && keyboardOpen ? viewport.innerHeight - rawKeyboardHeight : visualViewportHeight

  // toolbar element is not present when distractionFreeTyping is activated
  const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
  const navbarRect = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect()

  // On iOS Capacitor with the keyboard open the bottom navbar is hidden behind the keyboard, so the keyboard is the
  // only obstruction. On all other platforms the obstruction is the bottom navbar within the (already keyboard-aware)
  // visual viewport. (#4326)
  const navbarObstruction = isIOSCapacitor && keyboardOpen ? 0 : (navbarRect?.height ?? 0)

  return {
    /** The y position above which content is hidden behind the toolbar. */
    top: toolbarRect ? toolbarRect.bottom : 0,
    /** The y position below which content is obstructed. */
    bottom: effectiveViewportHeight - navbarObstruction,
    toolbarHeight: toolbarRect?.height ?? 0,
    keyboardOpen,
    visualViewportHeight,
    effectiveViewportHeight,
  }
}

export default getVisibleBounds
