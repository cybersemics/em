import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'

/** A middleware that closes any open toolbar dropdowns (e.g. Text Color, Letter Case) when the cursor is set to null. This handles cases where cursor becomes null without going through setCursor, such as when the last thought is deleted. */
const closeDropdownsWhenCursorNull: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    const prevCursor = getState().cursor

    next(action)

    const state = getState()

    // Close all open dropdowns when cursor transitions from non-null to null.
    // setCursor already handles this for direct cursor navigation, but other reducers (e.g. deleteThought) may set cursor to null directly.
    if (prevCursor !== null && state.cursor === null) {
      dispatch(toggleDropdown())
    }
  }
}

export default closeDropdownsWhenCursorNull
