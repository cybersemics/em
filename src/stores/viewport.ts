import _ from 'lodash'
import { isTouch } from '../browser'
import reactMinistore from './react-ministore'

// take a guess at the height of the virtual keyboard until we can measure it directly
let virtualKeyboardHeightPortrait = isTouch ? window.innerHeight / 2.275 : 0
let virtualKeyboardHeightLandscape = isTouch ? window.innerWidth / 1.7 : 0

/** A store that tracks the viewport dimensions, including the nontrivial virtual keyboard height. */
const viewportStore = reactMinistore({
  innerWidth: window.innerWidth,
  /** Height of the viewport, including the virtual keyboard. */
  innerHeight: window.innerHeight,
  scrollZoneWidth: Math.min(window.innerWidth, window.innerHeight) * 0.39,
  virtualKeyboardHeight:
    window.innerHeight > window.innerWidth ? virtualKeyboardHeightPortrait : virtualKeyboardHeightLandscape,
  currentKeyboardHeight: 0,
})

/** Throttled update of viewport height. Invoked on window resize. */
export const updateSize = _.throttle(
  () => {
    // There is a bug in iOS Safari where visualViewport.height is incorrect if the phone is rotated with the keyboard up, rotated back, and the keyboard is closed.
    // It can be detected by ensuring the visualViewport portrait mode matches window portrait mode.
    // If it is invalid, go back to the default
    const isPortrait = window.innerHeight > window.innerWidth
    const virtualKeyboardHeight = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0
    const isViewportValid =
      virtualKeyboardHeight > 0 && window.visualViewport!.height > window.visualViewport!.width === isPortrait

    // update the cached virtual keyboard height every time there is a valid visualViewport in case the keyboard has changed
    if (isViewportValid) {
      if (isPortrait) {
        virtualKeyboardHeightPortrait = virtualKeyboardHeight
      } else {
        virtualKeyboardHeightLandscape = virtualKeyboardHeight
      }
    }

    viewportStore.update({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      virtualKeyboardHeight:
        // when the keyboard is invalid or closed, use the cached height
        isViewportValid
          ? virtualKeyboardHeight
          : isPortrait
            ? virtualKeyboardHeightPortrait
            : virtualKeyboardHeightLandscape,
      currentKeyboardHeight: window.visualViewport ? window.innerHeight - window.visualViewport.height : 0,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
