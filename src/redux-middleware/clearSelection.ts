import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import isDivider from '../util/isDivider'

/** A Redux middleware that clear the browser selection if the cursor is on a divider or is null. */
const cursorChangedMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    const state = getState()
    const thought = state.cursor ? getThoughtById(state, head(state.cursor)) : null
    const value = thought?.value ?? null
    if ((!state.cursor && selection.isThought()) || isDivider(value)) {
      // selection.clear() can trigger Editable.onBlur which leads to more actions
      selection.clear()
    }
  }
}

export default cursorChangedMiddleware
