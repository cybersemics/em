import { cursorHistory, search as searchReducer, setCursor } from '../reducers'
import { contextOf, reducerFlow } from '../util'
import { State } from '../util/initialState'

/** Moves the cursor up one level. */
const cursorBack = (state: State) => {
  const { cursor: cursorOld, editing, search } = state
  const cursorNew = cursorOld && contextOf(cursorOld)

  return reducerFlow(

    // if there is a cursor, move it to its parent
    cursorOld ? [

      // move cursor back
      // @ts-ignore
      setCursor({ thoughtsRanked: cursorNew!.length > 0 ? cursorNew : null, editing }),

      // append to cursor history to allow 'forward' gesture
      cursorHistory({ cursor: cursorOld }),
    ]

    // if there is no cursor and search is active, close the search
    : search === '' ? [

      // close the search
      searchReducer({ value: null }),

      // restore the cursor
      state.cursorBeforeSearch
        ? setCursor({ thoughtsRanked: state.cursorBeforeSearch, editing })
        : null,
    ]
    : []
  )(state)
}

export default cursorBack
