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

/** Asserts that the cursor thought is valid. */
const validateCursor = (stateNew: State) => {
  const thought = stateNew.cursor ? getThoughtById(stateNew, head(stateNew.cursor)) : null
  if (stateNew.cursor && !thought) {
    const errorMessage = `Cursor thought does not exist: ${stateNew.cursor}`
    console.error(errorMessage, {
      cursor: stateNew.cursor,
    })
    throw new Error(errorMessage)
  } else if (stateNew.cursor && isRoot(stateNew.cursor)) {
    const errorMessage = `Cursor should be set to null, not [${HOME_TOKEN}]`
    console.error(errorMessage, {
      cursor: stateNew.cursor,
    })
    throw new Error(errorMessage)
  }
}

/** Manages side effects from the cursor changing. */
const cursorChangedMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    const stateOld = getState()
    next(action)
    const stateNew = getState()

    validateCursor(stateNew)

    const thought = stateNew.cursor ? getThoughtById(stateNew, head(stateNew.cursor)) : null
    const value = thought?.value ?? null

    // clears the cursor selection if on divider or cursor is null.
    const cursorCleared = // selection may still exist after jump to null
      (!stateNew.cursor && selection.isThought()) ||
      // clear selection when cursor is on divider
      (!equalPath(stateOld.cursor, stateNew.cursor) && isDivider(value))

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
