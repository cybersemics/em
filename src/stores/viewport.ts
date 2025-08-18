import _ from 'lodash'
import { isTouch } from '../browser'
import reactMinistore from './react-ministore'

/** Scroll zone as a percentage of the smaller size of the screen. */
const SCROLL_ZONE_WIDTH = 0.25

// take a guess at the height of the virtual keyboard until we can measure it directly
let virtualKeyboardHeightPortrait = isTouch ? window.innerHeight / 2.275 : 0
let virtualKeyboardHeightLandscape = isTouch ? window.innerWidth / 1.7 : 0

export interface ViewportState {
  contentWidth: number
  innerWidth: number
  innerHeight: number
  scrollOffset: number
  scrollZoneWidth: number
  virtualKeyboardHeight: number
}

/** A store that tracks the viewport dimensions, including the nontrivial virtual keyboard height. */
const viewportStore = reactMinistore<ViewportState>({
  innerWidth: window.innerWidth,
  /** Height of the viewport, including the virtual keyboard. */
  innerHeight: window.innerHeight,
  /** While a modal is open, iOS Safari will still permit the document body to scroll.
   * In order to prevent this, the documentElement and body must be "frozen" with "overflow": "hidden".
   * LayoutTree can use scrollOffset to render the thoughtspace correctly despite the lack of a scrollable viewport (#3165).
   */
  scrollOffset: 0,
  scrollZoneWidth: Math.min(window.innerWidth, window.innerHeight) * SCROLL_ZONE_WIDTH,
  /** Height of the virtual keyboard regardless of whether it is open or closed. Defaults to estimated height of portrait or landscape mode when window.visualViewport.width is not valid (see below; questionable). */
  virtualKeyboardHeight:
    window.innerHeight > window.innerWidth ? virtualKeyboardHeightPortrait : virtualKeyboardHeightLandscape,
  /** Width of the content element. */
  contentWidth: 0,
})

/** Throttled update of viewport height. Invoked on window resize. */
export const updateSize = _.throttle(
  () => {
    // There is a bug in iOS Safari where visualViewport.height is incorrect if the phone is rotated with the keyboard up, rotated back, and the keyboard is closed.
    // It can be detected by ensuring the visualViewport portrait mode matches window portrait mode.
    // If it is invalid, go back to the default
    const isPortrait = window.innerHeight > window.innerWidth
    const currentKeyboardHeight = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0
    const isViewportValid =
      currentKeyboardHeight > 0 && window.visualViewport!.height > window.visualViewport!.width === isPortrait

    // update the cached virtual keyboard height every time there is a valid visualViewport in case the keyboard has changed
    if (isViewportValid) {
      if (isPortrait) {
        virtualKeyboardHeightPortrait = currentKeyboardHeight
      } else {
        virtualKeyboardHeightLandscape = currentKeyboardHeight
      }
    }

    viewportStore.update({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      virtualKeyboardHeight:
        // when the keyboard is invalid or closed, use the cached height
        isViewportValid
          ? currentKeyboardHeight
          : isPortrait
            ? virtualKeyboardHeightPortrait
            : virtualKeyboardHeightLandscape,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
