import _ from 'lodash'
import { isTouch } from '../browser'
import reactMinistore from './react-ministore'

/** Scroll zone as a percentage of the smaller size of the screen. */
const SCROLL_ZONE_WIDTH = 0.25

// take a guess at the height of the virtual keyboard until we can measure it directly
let virtualKeyboardHeightPortrait = isTouch ? window.innerHeight / 2.275 : 0
let virtualKeyboardHeightLandscape = isTouch ? window.innerWidth / 1.7 : 0

export interface ViewportState {
  innerWidth: number
  innerHeight: number
  layoutTreeTop: number
  scrollZoneWidth: number
  virtualKeyboardHeight: number
}

/** A store that tracks the viewport dimensions, including the nontrivial virtual keyboard height. */
const viewportStore = reactMinistore<ViewportState>({
  innerWidth: window.innerWidth,
  /** Height of the viewport, including the virtual keyboard (i.e. does not change when the virtuaul keyboard is opened/closed). */
  innerHeight: window.innerHeight,
  scrollZoneWidth: Math.min(window.innerWidth, window.innerHeight) * SCROLL_ZONE_WIDTH,
  /** Height of the virtual keyboard regardless of whether it is open or closed. Initialized to estimated height. */
  virtualKeyboardHeight:
    window.innerHeight > window.innerWidth ? virtualKeyboardHeightPortrait : virtualKeyboardHeightLandscape,
  /** The y position of the layout tree element relative to the document. Includes autocrop, i.e. this value changes when space above is cropped away as you navigate deeper. This ensures that scrollCursorIntoView can properly calculate the position of the cursor relative to the viewport. */
  layoutTreeTop: 0,
})

/** Throttled update of viewport height. Invoked on window resize. */
export const updateSize = _.throttle(
  () => {
    // There is a bug in iOS Safari where visualViewport.height is incorrect if the phone is rotated with the keyboard up, rotated back, and the keyboard is closed.
    // It can be detected by ensuring the visualViewport portrait mode matches window portrait mode.
    // If it is invalid, go back to the default
    const isPortrait = window.innerHeight > window.innerWidth
    const currentKeyboardHeight = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0

    // update the cached virtual keyboard height every time there is a valid visualViewport in case the keyboard has changed
    if (isPortrait) {
      virtualKeyboardHeightPortrait = currentKeyboardHeight
    } else {
      virtualKeyboardHeightLandscape = currentKeyboardHeight
    }

    viewportStore.update({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      // when the keyboard is closed, use the cached height
      virtualKeyboardHeight: currentKeyboardHeight,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
