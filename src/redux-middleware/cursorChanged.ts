import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isRoot from '../util/isRoot'

/** Manages side effects from the cursor changing. */
const cursorChangedMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    const state = getState()
    next(action)
    const updatedState = getState()

    // validation
    const thought = updatedState.cursor ? getThoughtById(updatedState, head(updatedState.cursor)) : null
    if (updatedState.cursor && !thought) {
      const errorMessage = `Cursor thought does not exist: ${updatedState.cursor}`
      console.error(errorMessage, {
        action,
        cursor: updatedState.cursor,
        previousCursor: state.cursor,
      })
      throw new Error(errorMessage)
    } else if (updatedState.cursor && isRoot(updatedState.cursor)) {
      const errorMessage = `Cursor should be set to null, not [${HOME_TOKEN}]`
      console.error(errorMessage, {
        action,
        cursor: updatedState.cursor,
        previousCursor: state.cursor,
      })
      throw new Error(errorMessage)
    }

    const value = thought?.value ?? null

    // clears the cursor selection if on divider or cursor is null.
    const cursorCleared = // selection may still exist after jump to null
      (!updatedState.cursor && selection.isThought()) ||
      // clear selection when cursor is on divider
      (!equalPath(state.cursor, updatedState.cursor) && isDivider(value))

    // The live editing value is stored in a separate ministore to avoid Redux store churn.
    // When the cursor changes, update the editingValue store.
    editingValueStore.update(value)

    // selection.clear() can trigger Editable.onBlur which leads to store.getState()
    if (cursorCleared) {
      selection.clear()
    }
  }
}

export default cursorChangedMiddleware
