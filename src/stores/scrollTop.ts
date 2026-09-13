import _ from 'lodash'
import cancelOnReset from '../util/cancelOnReset'
import reactMinistore from './react-ministore'

/** A ministore that tracks dcoument.documentElement.scrollTop (throttled to 60 fps). */
const scrollTopStore = reactMinistore(document.documentElement.scrollTop)

/** Throttled update of scrollTop. Invoked on window scroll. */
export const updateScrollTop = cancelOnReset(
  _.throttle(
    () => {
      scrollTopStore.update(document.documentElement.scrollTop)
    },
    // lock to 60 fps
    16.666,
    { leading: true },
  ),
)

export default scrollTopStore
