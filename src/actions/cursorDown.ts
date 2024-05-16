import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setCursor from '../actions/setCursor'
import nextThought from '../selectors/nextThought'

/** Moves the cursor to the next child, sibling, or nearest uncle. */
const cursorDown = (state: State) => {
  // if there is a cursor, get the next logical child, sibling, or uncle
  const path = nextThought(state)
  return path
    ? setCursor(state, {
        path,
        cursorHistoryClear: true,
        editing: true,
      })
    : state
}

export default cursorDown

/** Action-creator for cursorDown. */
export const cursorDownActionCreator = (): Thunk => dispatch => dispatch({ type: 'cursorDown' })
