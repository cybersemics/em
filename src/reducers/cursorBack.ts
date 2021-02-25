import { cursorHistory, search as searchReducer, setCursor } from '../reducers'
import { isAbsolute, parentOf, reducerFlow } from '../util'
import { State } from '../util/initialState'
import toggleAbsoluteContext from './toggleAbsoluteContext'

/** Moves the cursor up one level. */
const cursorBack = (state: State) => {
  const { cursor: cursorOld, editing, search, rootContext } = state

  const isAbsoluteRoot = isAbsolute(rootContext)

  const cursorNew = cursorOld && parentOf(cursorOld)

  return reducerFlow(

    // if there is a cursor, move it to its parent
    cursorOld ? [

      // move cursor back
      setCursor({ path: cursorNew!.length > 0 ? cursorNew : null, editing }),

      // append to cursor history to allow 'forward' gesture
      cursorHistory({ cursor: cursorOld }),
    ]

    // if there is no cursor and isAbsoluteRoot is active, toggle the context
    // else of search is active, close the search
    :
    isAbsoluteRoot ? [toggleAbsoluteContext] : search === '' ? [
      // close the search
      searchReducer({ value: null }),

      // restore the cursor
      state.cursorBeforeSearch
        ? setCursor({ path: state.cursorBeforeSearch, editing })
        : null,
    ]
    : []

  )(state)
}

export default cursorBack
