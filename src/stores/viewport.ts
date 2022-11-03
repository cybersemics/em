import _ from 'lodash'
import ministore from './ministore'

/** A store that tracks the top and bottom of the viewport. */
const viewportStore = ministore({
  scrollTop: document.documentElement.scrollTop,
  innerHeight: window.innerHeight,
})

/** Throttled update of viewport height. */
export const updateHeight = _.throttle(
  () => {
    viewportStore.update({
      innerHeight: window.innerHeight,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

/** Throttled update of scrollTop. */
export const updateScrollTop = _.throttle(
  () => {
    viewportStore.update({
      scrollTop: document.documentElement.scrollTop,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
