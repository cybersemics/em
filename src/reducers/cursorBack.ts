import { cursorHistory, search as searchReducer, setCursor } from '../reducers'
import { clearSelection, contextOf, reducerFlow, scrollCursorIntoView } from '../util'
import { State } from '../util/initialState'

/** Removes the browser selection. */
const blur = () => {
  if (document.activeElement) {
    (document.activeElement as HTMLInputElement).blur() // eslint-disable-line no-extra-parens
    clearSelection()
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
      setCursor({ thoughtsRanked: cursorNew!.length > 0 ? cursorNew : null, editing }),

      // append to cursor history to allow 'forward' gesture
      cursorHistory({ cursor: cursorOld }),

      // SIDE EFFECT
      cursorNew?.length === 0 ? state => {
        blur()
        return state
      } : null,
    ]

    // if there is no cursor and search is active, close the search
    : search === '' ? [

      // close the search
      searchReducer({ value: null }),

      // restore the cursor
      state.cursorBeforeSearch
        ? setCursor({ thoughtsRanked: state.cursorBeforeSearch, editing })
        : null,

      // SIDE EFFECT
      // scroll cursor into view
      state => {
        setTimeout(scrollCursorIntoView, 200)
        return state
      }
    ]
    : []
  )(state)
}

export default cursorBack
