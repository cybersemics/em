import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import * as selection from '../device/selection'
import contextThoughtId from '../selectors/contextThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'

/** A Redux middleware that clear the browser selection if the cursor is on a divider or is null. */
const cursorChangedMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    const state = getState()
    // the displayed thought, i.e. the context in the context view, since whether the row is editable depends on what
    // the user sees rather than on the Lexeme instance the cursor lands on
    const cursorThoughtId = state.cursor ? contextThoughtId(state, state.cursor) : null
    const thought = cursorThoughtId ? getThoughtById(state, cursorThoughtId) : null
    const value = thought?.value ?? ''
    if (
      (!state.cursor && selection.isThought()) ||
      isDivider(value) ||
      // Check if the thought displayed at the head of the cursor is the root thought.
      // This occurs when navigating a root child in the context view.
      (cursorThoughtId && isRoot([cursorThoughtId]))
    ) {
      // selection.clear() can trigger Editable.onBlur which leads to more actions
      selection.clear()
    }
  }
}

export default cursorChangedMiddleware
