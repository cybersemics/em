import { contextOf, reducerFlow } from '../util'
import { cursorHistory, search as searchReducer, setCursor } from '../reducers'
import { State } from '../util/initialState'

/** Removes the browser selection. */
const blur = () => {
  if (document.activeElement) {
    // @ts-ignore
    document.activeElement.blur()
    const sel = document.getSelection()
    if (sel) {
      sel.removeAllRanges()
    }
  }
}

/** Moves the cursor up one level. */
const cursorBack = (state: State) => {
  const { cursor: cursorOld, editing, search } = state
  const cursorNew = cursorOld && contextOf(cursorOld)

  return reducerFlow(

    // if there is a cursor, move it to its parent
    cursorOld ? [

      // move cursor back
      // @ts-ignore
      state => setCursor(state, { thoughtsRanked: cursorNew.length > 0 ? cursorNew : null, editing }),

      // append to cursor history to allow 'forward' gesture
      state => cursorHistory(state, { cursor: cursorOld }),

      // SIDE EFFECT
      cursorNew?.length === 0 ? state => {
        blur()
        return state
      } : null,
    ]

    // if there is no cursor and search is active, close the search
    : search === '' ? [

      // close the search
      // @ts-ignore
      state => searchReducer(state, { value: null }),

      // restore the cursor
      state => state.cursorBeforeSearch
        // @ts-ignore
        ? setCursor(state, { thoughtsRanked: state.cursorBeforeSearch, editing })
        : state,
    ]
    : []
  )(state)
}

export default cursorBack
