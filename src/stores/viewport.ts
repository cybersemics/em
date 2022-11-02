import _ from 'lodash'
import ministore from './ministore'

/** A store that tracks the top and bottom of the viewport. */
const viewportStore = ministore({
  top: document.documentElement.scrollTop,
  bottom: window.innerHeight + document.documentElement.scrollTop,
})

/** Update viewport dimensions on scroll for list virtualization. See: viewportStore and LayoutTree. */
export const updateViewport = _.throttle(
  () => {
    viewportStore.update({
      top: document.documentElement.scrollTop,
      bottom: window.innerHeight + document.documentElement.scrollTop,
    })
  },
  // lock to 60 fps
  16.666,
  { leading: true },
)

export default viewportStore
