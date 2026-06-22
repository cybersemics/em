import _ from 'lodash'
import reactMinistore from './react-ministore'

/** Scroll zone as a percentage of the smaller size of the screen. */
const SCROLL_ZONE_WIDTH = 0.25

export interface ViewportState {
  innerWidth: number
  innerHeight: number
  layoutTreeTop: number
  scrollZoneWidth: number
}

/** A store that tracks the viewport dimensions. */
const viewportStore = reactMinistore<ViewportState>({
  innerWidth: window.innerWidth,
  /** Height of the viewport, including the virtual keyboard (i.e. does not change when the virtual keyboard is opened/closed). */
  innerHeight: window.innerHeight,
  scrollZoneWidth: Math.min(window.innerWidth, window.innerHeight) * SCROLL_ZONE_WIDTH,
  /** The y position of the layout tree element relative to the document. Includes autocrop, i.e. this value changes when space above is cropped away as you navigate deeper. This ensures that scrollCursorIntoView can properly calculate the position of the cursor relative to the viewport. */
  layoutTreeTop: 0,
})

/** Throttled update of viewport dimensions. Invoked on window resize. */
export const updateSize = _.throttle(
  () => {
    viewportStore.update({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
