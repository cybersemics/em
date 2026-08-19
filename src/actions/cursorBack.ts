import State from '../@types/State'
import Thunk from '../@types/Thunk'
import addMulticursor from '../actions/addMulticursor'
import cursorHistory from '../actions/cursorHistory'
import removeMulticursor from '../actions/removeMulticursor'
import searchReducer from '../actions/search'
import setCursor from '../actions/setCursor'
import expandThoughts from '../selectors/expandThoughts'
import hasMulticursor from '../selectors/hasMulticursor'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import isAbsolute from '../util/isAbsolute'
import isEM from '../util/isEM'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import toggleAbsoluteContext from './toggleAbsoluteContext'
import toggleEmContext from './toggleEmContext'

/** Replaces the multiselect with the parents of each selected thought. Parents shared by multiple selected thoughts are selected once, since the multicursor set is keyed by path. */
const multicursorBack = (state: State): State => {
  const paths = Object.values(state.multicursors)

  // Root-level thoughts contribute no parent, since the root cannot be selected.
  const backPaths = paths.filter(path => path.length > 1).map(parentOf)

  // do nothing if all selected thoughts are at the root level, so that an extra Back gesture does not destroy the selection
  if (backPaths.length === 0) return state

  const stateNew = reducerFlow([
    // Deselecting before selecting is safe within a single action, since multicursorAlertMiddleware only sees the
    // final state and thus never a momentarily empty multiselect (which would close the Command Center on mobile).
    // A selected thought that is also the parent of another selected thought is deselected and reselected.
    ...paths.map(path => removeMulticursor({ path })),
    ...backPaths.map(path => addMulticursor({ path })),
  ])(state)

  return {
    ...stateNew,
    // Selected thoughts are kept collapsed by expandThoughts, so expansion must be recalculated for the newly
    // selected parents to collapse the previously selected children.
    // https://github.com/cybersemics/em/issues/4738
    expanded: expandThoughts(stateNew, stateNew.cursor),
  }
}

/** Moves the cursor up one level. When thoughts are selected, replaces the selection with their parents instead of moving the cursor. */
const cursorBack = (state: State): State => {
  if (hasMulticursor(state)) return multicursorBack(state)

  const { cursor: cursorOld, isKeyboardOpen, search, rootContext } = state

  const isAbsoluteRoot = isAbsolute(rootContext)

  const cursorNew = cursorOld && parentOf(cursorOld)

  return reducerFlow(
    // if there is a cursor, move it to its parent
    cursorOld
      ? [
          // move cursor back
          setCursor({
            // offset shouldn't be null if we want useEditMode to set the selection to the new thought
            offset: 0,
            // the EM root itself is not rendered, so a cursor that would land on [EM_TOKEN] clears instead
            path: cursorNew!.length > 0 && !isEM(cursorNew!) ? cursorNew : null,
            isKeyboardOpen,
            preserveMulticursor: true,
          }),

          // append to cursor history to allow 'forward' gesture
          cursorHistory({ cursor: cursorOld }),
        ]
      : // if there is no cursor and isAbsoluteRoot or the EM context is active, toggle out of the context
        // else of search is active, close the search
        isAbsoluteRoot
        ? [toggleAbsoluteContext]
        : isEM(rootContext)
          ? [toggleEmContext]
          : search === ''
            ? [
                // close the search
                searchReducer({ value: null }),

                // restore the cursor
                state.cursorBeforeSearch ? setCursor({ path: state.cursorBeforeSearch, isKeyboardOpen }) : null,
              ]
            : [],
  )(state)
}

/** Action-creator for cursorBack. */
export const cursorBackActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorBack' })

export default cursorBack

// Register this action's metadata
registerActionMetadata('cursorBack', {
  undoable: true,
  isNavigation: true,
})
