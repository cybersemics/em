import _ from 'lodash'
import { isTouch } from '../browser'
import reactMinistore from './react-ministore'

/** Scroll zone as a percentage of the smaller size of the screen. */
const SCROLL_ZONE_WIDTH = 0.333

// take a guess at the height of the virtual keyboard until we can measure it directly
let virtualKeyboardHeightPortrait = isTouch ? window.innerHeight / 2.275 : 0
let virtualKeyboardHeightLandscape = isTouch ? window.innerWidth / 1.7 : 0

/** A store that tracks the viewport dimensions, including the nontrivial virtual keyboard height. */
const viewportStore = reactMinistore({
  innerWidth: window.innerWidth,
  /** Height of the viewport, including the virtual keyboard. */
  innerHeight: window.innerHeight,
  scrollZoneWidth: Math.min(window.innerWidth, window.innerHeight) * SCROLL_ZONE_WIDTH,
  /** Height of the virtual keyboard regardless of whether it is open or closed. Defaults to estimated height of portrait or landscape mode when window.visualViewport.width is not valid (see below; questionable). */
  virtualKeyboardHeight:
    window.innerHeight > window.innerWidth ? virtualKeyboardHeightPortrait : virtualKeyboardHeightLandscape,
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
