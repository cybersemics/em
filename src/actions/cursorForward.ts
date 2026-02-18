import { last } from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor from '../actions/setCursor'
import { HOME_PATH } from '../constants'
import { firstVisibleChild } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isRoot from '../util/isRoot'
import unroot from '../util/unroot'

/** Moves the cursor forward in the cursorHistory. */
const cursorForward = (state: State): State => {
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
