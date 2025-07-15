import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { LongPressState } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'

interface Payload {
  value: LongPressState
}

/** Reducer for managing the state of a long press. */
const longPress = (state: State, { value = LongPressState.Inactive }: Payload) => {
  if (
    // DragHold must be triggered by the beginning of a long press, don't go back from another state
    (value === LongPressState.DragHold && state.longPress === LongPressState.Inactive) ||
    // Drag should only begin after long press has begun, but the occasional race condition
    // may allow react-dnd to initiate a drag before useLongPress sets this to DragHold.
    // Drag should not re-start after DragCancelled.
    (value === LongPressState.DragInProgress &&
      (state.longPress === LongPressState.DragHold || state.longPress === LongPressState.Inactive)) ||
    // Drag can only be cancelled if it was in progress
    (value === LongPressState.DragCancelled && state.longPress === LongPressState.DragInProgress) ||
    // Can return to Inactive from any state
    value === LongPressState.Inactive
  )
    return { ...state, longPress: value }

  console.error(`Invalid longPress transition: ${state.longPress} to ${value}`)

  return state
}

/** Action-creator for longPress. */
export const longPressActionCreator =
  (payload: Parameters<typeof longPress>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'longPress', ...payload })

export default _.curryRight(longPress)

// Register this action's metadata
registerActionMetadata('longPress', {
  undoable: false,
})
