import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor from '../actions/setCursor'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import { getChildrenSorted } from '../selectors/getChildren'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'

/** Moves the cursor to the previous sibling. Works in normal or context view. If there is no cursor, sets the cursor on the last thought of in the home context. */
const cursorUp = (state: State) => {
  const { cursor } = state
  const path = cursor || HOME_PATH
  const pathParent = rootedParentOf(state, path)

  const prevThought = cursor
    ? // if cursor exists, get the previous sibling
      prevSibling(state, cursor)
    : // otherwise, get the last thought in the home context
      getChildrenSorted(state, HOME_TOKEN).slice(-1)[0]

  const prevPath = prevThought
    ? // non-first child path
      appendToPath(parentOf(path), prevThought.id)
    : // when the cursor is on the first child in a context, move up a level
      !isRoot(pathParent)
      ? pathParent
      : null

  // noop if there is no previous path, i.e. the cursor is on the very first thought
  return prevPath ? setCursor(state, { path: prevPath }) : state
}

/** Action-creator for cursorUp. */
export const cursorUpActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorUp' })

export default cursorUp
