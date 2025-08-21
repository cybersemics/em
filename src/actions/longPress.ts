import _ from 'lodash'
import DragThoughtZone from '../@types/DragThoughtZone'
import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType, LongPressState } from '../constants'
import globals from '../globals'
import hasMulticursor from '../selectors/hasMulticursor'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import haptics from '../util/haptics'
import head from '../util/head'
import shaker from '../util/shaker'
import alert from './alert'
import { expandHoverDownActionCreator as expandHoverDown } from './expandHoverDown'
import { expandOnHoverTopActionCreator as expandHoverUp } from './expandHoverUp'

interface InactivePayload {
  value: LongPressState.Inactive
}

interface DragHoldPayload {
  value: LongPressState.DragHold
  simplePath?: SimplePath
  sourceZone?: DragThoughtZone
}

interface DragInProgressPayload {
  value: LongPressState.DragInProgress
  // Sets state.draggingThoughts. Either hoveringPath or file must be set if value is true.
  draggingThoughts?: SimplePath[]
  hoveringPath?: Path
  hoverZone?: DropThoughtZone
  // Sets state.draggingFile. Either hoveringPath or file must be set if value is true.
  draggingFile?: boolean
  offset?: number
  sourceZone?: DragThoughtZone
}

interface DragCanceledPayload {
  value: LongPressState.DragCanceled
}

type Payload = InactivePayload | DragHoldPayload | DragInProgressPayload | DragCanceledPayload

const longPressInactiveState = {
  draggingFile: false,
  draggedSimplePath: undefined,
  draggingThoughts: [],
  hoveringPath: undefined,
  hoverZone: undefined,
  simplePath: undefined,
}

/** Reducer for managing the state of a long press. */
const longPress = (state: State, payload: Payload) => {
  switch (payload.value) {
    case LongPressState.Inactive:
      // Can return to Inactive from any state
      return {
        ...state,
        ...longPressInactiveState,
        longPress: LongPressState.Inactive,
        draggingFile: false,
      }
    case LongPressState.DragHold:
      // DragHold must be triggered by the beginning of a long press, don't go back from another state
      if (state.longPress === LongPressState.Inactive) {
        const { simplePath, sourceZone } = payload
        return {
          ...(hasMulticursor(state)
            ? state
            : alert(state, {
                value: sourceZone === DragThoughtZone.Thoughts ? AlertText.DragAndDrop : AlertText.ReorderFavorites,
                alertType: AlertType.DragAndDropHint,
                showCloseLink: false,
              })),
          ...longPressInactiveState,
          longPress: LongPressState.DragHold,
          // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
          draggedSimplePath: state.draggedSimplePath ? (!simplePath ? undefined : state.draggedSimplePath) : simplePath,
        }
      }
      break
    case LongPressState.DragInProgress:
      // Drag should only begin after long press has begun, but the occasional race condition
      // may allow react-dnd to initiate a drag before useLongPress sets this to DragHold.
      // Drag should not re-start after DragCanceled.
      // Drag can be transitioned from DragInProgress to DragInProgress when the hovering path changes.
      if ([LongPressState.DragHold, LongPressState.DragInProgress, LongPressState.Inactive].includes(state.longPress)) {
        const { draggingThoughts, draggingFile, hoveringPath, hoverZone, offset, sourceZone } = payload

        return {
          ...alert(state, {
            value: sourceZone === DragThoughtZone.Thoughts ? AlertText.DragAndDrop : AlertText.ReorderFavorites,
            alertType: AlertType.DragAndDropHint,
            showCloseLink: false,
          }),
          ...longPressInactiveState,
          longPress: LongPressState.DragInProgress,
          draggingFile,
          draggingThoughts: draggingThoughts || [],
          hoveringPath,
          hoverZone,
          cursorOffset: offset || state.cursorOffset,
        }
      }
      break
    case LongPressState.DragCanceled:
      // Drag can only be cancelled if it was in progress
      if (state.longPress === LongPressState.DragInProgress) {
        return {
          ...state,
          ...longPressInactiveState,
          longPress: LongPressState.DragCanceled,
        }
      }
  }

  console.error(`Invalid longPress transition: ${state.longPress} to ${payload.value}`)

  return state
}

/** Action-creator for longPress. */
export const longPressActionCreator =
  (payload: Parameters<typeof longPress>[1]): Thunk =>
  (dispatch, getState) => {
    const { longPress: previousValue } = getState()
    const { value } = payload

    switch (value) {
      case LongPressState.DragInProgress:
        haptics.light()
        break
      case LongPressState.Inactive:
        globals.touching = false
        break
    }

    dispatch({ type: 'longPress', ...payload })

    if (value === LongPressState.DragInProgress) {
      const { hoveringPath } = payload

      // abort drag-and-drop on shake
      // must go after dispatching dragInProgress, otherwise aborted dragInProgress: false will get overwritten by the payload
      shaker(dispatch, hoveringPath ? head(hoveringPath) : undefined)
    }

    if (value === LongPressState.DragInProgress || previousValue === LongPressState.DragInProgress) {
      dispatch(expandHoverUp())
      dispatch(expandHoverDown())
    }
  }

export default _.curryRight(longPress)

// Register this action's metadata
registerActionMetadata('longPress', {
  undoable: false,
})
