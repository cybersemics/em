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
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import headValue from '../util/headValue'
import unroot from '../util/unroot'

/** Moves the cursor forward in the cursorHistory. */
const cursorForward = (state: State) => {
  const cursorFromHistory = last(state.cursorHistory)
  const cursor = state.cursor || HOME_PATH
  const showContexts = isContextViewActive(state, cursor)

  // context view
  let cursorNew, isValidChild
  if (showContexts) {
    const contexts = getContextsSortedAndRanked(state, headValue(state, cursor))
    const firstContext = contexts[0]
    isValidChild = cursorFromHistory && contexts.some(cx => cx.parentId === head(cursorFromHistory))
    cursorNew = isValidChild ? cursorFromHistory : appendToPath(cursor, firstContext.parentId)
  }
  // normal view
  else {
    const simplePath = simplifyPath(state, cursor)
    const firstChild = firstVisibleChild(state, head(simplePath))
    isValidChild = cursorFromHistory && !!getThoughtById(state, head(cursor)).childrenMap[head(cursorFromHistory)]
    cursorNew = isValidChild ? cursorFromHistory : firstChild ? unroot([...cursor, firstChild.id]) : cursor
  }

  return cursorNew ? setCursor(state, { path: cursorNew, cursorHistoryPop: isValidChild }) : state
}

/** Action-creator for cursorForward. */
export const cursorForwardActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorForward' })

export default cursorForward
