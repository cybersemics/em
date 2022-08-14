import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import Thunk from '../@types/Thunk'
import { DropTarget } from '../constants'
import globals from '../globals'
import { store } from '../store'
import head from '../util/head'
import alert from './alert'
import expandOnHoverBottom from './expandOnHoverBottom'
import expandOnHoverTop from './expandOnHoverTop'

interface Payload {
  value: boolean
  draggingThought?: SimplePath
  hoveringPath?: Path
  hoverId?: DropTarget
  offset?: number
}

/** A utility that shakes if hit too much. Call shaker.hit with a id representing the source of the hit. If the number of unique ids exceeds the SHAKE_THRESHOLD within DEBOUNCE_SHAKING, trigger a shake. */
const Shaker = (onShake: () => unknown) => {
  // track the different draggingThoughts values that are dispatched within a period of time
  const DEBOUNCE_SHAKING = 100

  // the number of unique Paths that must be hovered over within the BEBOUNCE_SHAKING period to a trigger a shake
  const SHAKE_THRESHOLD = 6

  let repeatedMax = 0
  let repeatedIds: Index<number> = {}

  /** Resets the repeat counts. */
  const reset = () => {
    repeatedMax = 0
    repeatedIds = {}
  }

  /* Reset counters when shaking stops. */
  const shaking = _.debounce(reset, DEBOUNCE_SHAKING)

  return (id?: string) => {
    // count repeated ids
    if (id) {
      repeatedIds[id] = (repeatedIds[id] || 0) + 1
      repeatedMax = Math.max(repeatedMax, repeatedIds[id])
    }

    // check if we reached the shake threshold
    if (repeatedMax >= SHAKE_THRESHOLD) {
      onShake()
      reset()
    }

    // start the timer on each hit
    shaking()
  }
}

// abort drag-and-drop on shake
const shaker = Shaker(() => {
  // force drag to abort
  // we need to make all drop targets, visible drag behavior, and drop handlers short circuit when the drag has been aborted
  // react-dnd does not allow programmatic cancellation of drag
  store.dispatch([
    {
      type: 'dragInProgress',
      value: false,
    },
    alert('✗ Drag cancelled'),
  ])
})

/** Drag in progress. */
const dragInProgress =
  (payload: Payload): Thunk =>
  (dispatch, getState) => {
    const { hoveringPath, value } = payload

    // react-dnd stops propagation of the TouchMonitor's touchend event, so we need to turn off globals.touching here
    if (!value) {
      globals.touching = false
    }

    dispatch({
      type: 'dragInProgress',
      ...payload,
    })

    // abort drag-and-drop on shake
    // must go after dispatching dragInProgress, otherwise aborted dragInProgress: false will get overwritten by the payload
    shaker(hoveringPath ? head(hoveringPath) : undefined)

    // when at the top of the viewport, bump the scroll bar to prevent gitching in Safari mobile
    // TODO: It still glitches out if you scroll back to the top during a drag
    if (document.documentElement.scrollTop === 0) {
      window.scrollTo(0, document.documentElement.scrollTop + 1)
    }

    dispatch(expandOnHoverTop())
    dispatch(expandOnHoverBottom())
  }

export default dragInProgress
