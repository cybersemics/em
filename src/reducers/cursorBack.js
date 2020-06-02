// util
import {
  contextOf,
  reducerFlow,
} from '../util'

// reducers
import setCursor from './setCursor'
import cursorHistory from './cursorHistory'
import searchReducer from './search'

/** Removes the browser selection. */
const blur = () => {
  document.activeElement.blur()
  document.getSelection().removeAllRanges()
}

/** Moves the cursor up one level. */
export default state => {
  const { cursor: cursorOld, editing, search } = state
  const cursorNew = cursorOld && contextOf(cursorOld)

  return reducerFlow(

    // if there is a cursor, move it to its parent
    cursorOld ? [

      // move cursor back
      state => setCursor(state, { thoughtsRanked: cursorNew.length > 0 ? cursorNew : null, editing }),

      // append to cursor history to allow 'forward' gesture
      state => cursorHistory(state, { cursor: cursorOld }),

      // SIDE EFFECT
      cursorNew.length === 0 ? blur() : null,
    ]

    // if there is no cursor and search is active, close the search
    : search === '' ? [

      // close the search
      state => searchReducer(state, { value: null }),

      // restore the cursor
      state => state.cursorBeforeSearch
        ? setCursor(state, { thoughtsRanked: state.cursorBeforeSearch, editing })
        : state,
    ]
    : []
  )(state)
}
