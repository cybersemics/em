import DropThoughtZone from '../@types/DropThoughtZone'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timer from '../@types/Timer'
import { clearExpandDownActionCreator as clearExpandDown } from '../actions/clearExpandDown'
import { AlertType, EXPAND_HOVER_DELAY } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import rootedParentOf from '../selectors/rootedParentOf'
import { registerActionMetadata } from '../util/actionMetadata.registry'

let expandDownTimer: Timer | null = null

/** Clears active delayed dispatch. */
const clearTimer = () => {
  if (expandDownTimer) {
    clearTimeout(expandDownTimer)
    expandDownTimer = null
  }
}

/** Delays dispatch of expandHoverDown. */
const expandHoverDownDebounced =
  (path: Path): Thunk =>
  (dispatch, getState) => {
    clearTimer()
    expandDownTimer = setTimeout(() => {
      const state = getState()
      // abort if dragging over quick drop components
      if (state.alert?.alertType === AlertType.DeleteDropHint || state.alert?.alertType === AlertType.CopyOneDropHint)
        return
      dispatch({ type: 'expandHoverDown', path })
      expandDownTimer = null
    }, EXPAND_HOVER_DELAY)
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

  const { hoveringPath, hoverZone, dragInProgress } = state

  clearTimer()

  // clear expandHoverDown immediately if drag-and-drop ends
  if (!dragInProgress) {
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
