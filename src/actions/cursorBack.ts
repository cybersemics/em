import State from '../@types/State'
import Thunk from '../@types/Thunk'
import cursorHistory from '../actions/cursorHistory'
import searchReducer from '../actions/search'
import setCursor from '../actions/setCursor'
import isAbsolute from '../util/isAbsolute'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import toggleAbsoluteContext from './toggleAbsoluteContext'

/** Moves the cursor up one level. */
const cursorBack = (state: State) => {
  const { cursor: cursorOld, editing, search, rootContext } = state

  const isAbsoluteRoot = isAbsolute(rootContext)

  const cursorNew = cursorOld && parentOf(cursorOld)

  return reducerFlow(
    // if there is a cursor, move it to its parent
    cursorOld
      ? [
          // move cursor back
          setCursor({ path: cursorNew!.length > 0 ? cursorNew : null, editing }),

          // append to cursor history to allow 'forward' gesture
          cursorHistory({ cursor: cursorOld }),
        ]
      : // if there is no cursor and isAbsoluteRoot is active, toggle the context
        // else of search is active, close the search
        isAbsoluteRoot
        ? [toggleAbsoluteContext]
        : search === ''
          ? [
              // close the search
              searchReducer({ value: null }),

              // restore the cursor
              state.cursorBeforeSearch ? setCursor({ path: state.cursorBeforeSearch, editing }) : null,
            ]
          : [],
  )(state)
}

/** Action-creator for cursorBack. */
export const cursorBackActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorBack' })

export default cursorBack
