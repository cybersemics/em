import _ from 'lodash'
import Dispatch from '../@types/Dispatch'
import { alertActionCreator } from '../actions/alert'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { LongPressState } from '../constants'

/** A utility that shakes if hit too much. Returns a hit function that takes an id representing the source of the hit. If the number of unique ids exceeds the SHAKE_THRESHOLD within DEBOUNCE_SHAKING, trigger onShake. */
const Shaker = <T>(
  onShake: (
    /** Extra data that is passed to onShake from the last call to hit. This is used to pass dispatch from the dragInProgressActionCreator since importing the app store causes a circular import. */
    data: T,
  ) => void,
) => {
  // track the different draggingThoughts values that are dispatched within a period of time
  const DEBOUNCE_SHAKING = 100

  // the number of unique Paths that must be hovered over within the BEBOUNCE_SHAKING period to a trigger a shake
  const SHAKE_THRESHOLD = 6

  let repeatedMax = 0
  const repeatedIds = new Map<string, number>()

  /** Resets the repeat counts. */
  const reset = () => {
    repeatedMax = 0
    repeatedIds.clear()
  }

  /* Reset counters when shaking stops. */
  const shaking = _.debounce(reset, DEBOUNCE_SHAKING)

  return (data: T, id?: string) => {
    // count repeated ids
    if (id) {
      const count = (repeatedIds.get(id) || 0) + 1
      repeatedIds.set(id, count)
      repeatedMax = Math.max(repeatedMax, count)
    }

    // check if we reached the shake threshold
    if (repeatedMax >= SHAKE_THRESHOLD) {
      onShake(data)
      reset()
    }

    // start the timer on each hit
    shaking()
  }
}

// abort drag-and-drop on shake
const shaker = Shaker((dispatch: Dispatch) => {
  // force drag to abort
  // we need to make all drop targets, visible drag behavior, and drop handlers short circuit when the drag has been aborted
  // react-dnd does not allow programmatic cancellation of drag
  dispatch([longPress({ value: LongPressState.DragCanceled }), alertActionCreator('✗ Drag cancelled')])
})

export default shaker
