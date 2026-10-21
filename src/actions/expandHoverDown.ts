import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { clearExpandDownActionCreator as clearExpandDown } from '../actions/clearExpandDown'
import { AlertType, EXPAND_HOVER_DELAY, LongPressState } from '../constants'
import testFlags from '../e2e/testFlags'
import expandThoughts from '../selectors/expandThoughts'
import rootedParentOf from '../selectors/rootedParentOf'
import ministore from '../stores/ministore'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** The pending delayed dispatch of expandHoverDown. A ministore whose dispose clears the timer, so that resetStores cancels it between tests. The timer is null whenever none is armed. */
const expandDownTimerStore = ministore<{ timer: Timer | null }>(
  { timer: null },
  { dispose: ({ timer }) => clearTimeout(timer ?? undefined) },
)

/** Clears active delayed dispatch. */
const clearTimer = () => {
  clearTimeout(expandDownTimerStore.getState().timer ?? undefined)
  expandDownTimerStore.update({ timer: null })
}

/** Delays dispatch of expandHoverDown. */
const expandHoverDownDebounced =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    clearTimer()
    const timer = setTimeout(() => {
      expandDownTimerStore.update({ timer: null })
      const state = getState()
      // abort if dragging over DropGutter component
      if (state.alert?.alertType === AlertType.DeleteDropHint) return
      dispatch({ type: 'expandHoverDown', path })
    }, testFlags.expandHoverDelay ?? EXPAND_HOVER_DELAY)
    expandDownTimerStore.update({ timer })
  }

/** Calculates the expanded context due to hover expansion on empty child drop. */
const expandDown = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expanded: {
    // always expand from cursor
    ...expandThoughts(state, state.cursor),
    // additionally expand from the the new expandHoverDownPath
    ...expandThoughts(state, path),
  },
  expandHoverDownPath: path,
})

/** Expands state.hoveringPath after a delay. Only expands if it is a valid Path with children and it is not already expanded. Expands using state.expandHoverDownPaths so that it can be toggled independently from autoexpansion with expandThoughts. */
export const expandHoverDownActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()

  const { hoveringPath, hoverZone, longPress } = state

  clearTimer()

  // clear expandHoverDown immediately if drag-and-drop ends
  if (longPress !== LongPressState.DragInProgress) {
    dispatch(clearExpandDown())
  }
  // otherwise, expand the hoveringPath
  else if (hoveringPath) {
    dispatch(
      expandHoverDownDebounced(
        // if hovering over a ThoughtDrop zone, then hoveringPath points to a sibling thought and we need to expand the parent
        hoverZone === DropThoughtZone.ThoughtDrop ? rootedParentOf(state, hoveringPath) : hoveringPath,
      ),
    )
  }
}

export default expandDown

// Register this action's metadata
registerActionMetadata('expandHoverDown', {
  undoable: false,
})
