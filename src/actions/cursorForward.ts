import { last } from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import addMulticursor from '../actions/addMulticursor'
import removeMulticursor from '../actions/removeMulticursor'
import setCursor from '../actions/setCursor'
import { HOME_PATH } from '../constants'
import expandThoughts from '../selectors/expandThoughts'
import { firstVisibleChild, getChildrenSorted } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursor from '../selectors/hasMulticursor'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import reducerFlow from '../util/reducerFlow'
import unroot from '../util/unroot'

/** Replaces the multiselect with the thoughts one level forward of each selected thought, i.e. the contexts of a thought whose context view is active, otherwise its visible children. */
const multicursorForward = (state: State): State => {
  const paths = Object.values(state.multicursors)
  const forwardPaths = paths.flatMap(path => {
    const contextViewValue = isContextViewActive(state, path) ? headValue(state, path) : undefined
    return contextViewValue !== undefined
      ? getContextsSortedAndRanked(state, contextViewValue).map(cx => appendToPath(path, cx.parentId))
      : getChildrenSorted(state, head(simplifyPath(state, path))).map(child => appendToPath(path, child.id))
  })

  // do nothing if none of the selected thoughts have children, just as the cursor does not move forward from a leaf
  if (forwardPaths.length === 0) return state

  const stateNew = reducerFlow([
    // Deselecting before selecting is safe within a single action, since multicursorAlertMiddleware only sees the
    // final state and thus never a momentarily empty multiselect (which would close the Command Center on mobile).
    // A selected thought that is also the child of another selected thought is deselected and reselected.
    ...paths.map(path => removeMulticursor({ path })),
    ...forwardPaths.map(path => addMulticursor({ path })),
  ])(state)

  return {
    ...stateNew,
    // Selected thoughts are kept collapsed by expandThoughts, so expansion must be recalculated for the newly
    // selected thoughts to be visible under their now deselected parents.
    // https://github.com/cybersemics/em/issues/4738
    expanded: expandThoughts(stateNew, stateNew.cursor),
  }
}

/** Moves the cursor forward in the cursorHistory. When thoughts are selected, replaces the selection with the thoughts one level forward instead of moving the cursor. */
const cursorForward = (state: State): State => {
  if (hasMulticursor(state)) return multicursorForward(state)

  const cursorFromHistory = last(state.cursorHistory)
  const cursor = state.cursor || HOME_PATH
  const showContexts = isContextViewActive(state, cursor)

  // context view
  let cursorNew, isValidChild
  if (showContexts) {
    const cursorValue = headValue(state, cursor)
    const contexts = cursorValue !== undefined ? getContextsSortedAndRanked(state, cursorValue) : []
    const firstContext = contexts[0]
    isValidChild = cursorFromHistory && contexts.some(cx => cx.parentId === head(cursorFromHistory))
    cursorNew = isValidChild ? cursorFromHistory : appendToPath(cursor, firstContext.parentId)
  }
  // normal view
  else {
    const simplePath = simplifyPath(state, cursor)
    const firstChild = firstVisibleChild(state, head(simplePath))
    isValidChild = cursorFromHistory && !!getThoughtById(state, head(cursor))?.childrenMap[head(cursorFromHistory)]
    cursorNew =
      isValidChild && cursorFromHistory
        ? appendToPath(cursor, head(cursorFromHistory))
        : firstChild
          ? unroot([...cursor, firstChild.id])
          : isRoot(cursor)
            ? null
            : cursor
  }

  return cursorNew
    ? setCursor(state, {
        // offset shouldn't be null if we want useEditMode to set the selection to the new thought
        offset: 0,
        path: cursorNew,
        cursorHistoryPop: isValidChild,
        preserveMulticursor: true,
      })
    : state
}

/** Action-creator for cursorForward. */
export const cursorForwardActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorForward' })

export default cursorForward

// Register this action's metadata
registerActionMetadata('cursorForward', {
  undoable: true,
  isNavigation: true,
})
