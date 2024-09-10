import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { endMulticursorTransactionActionCreator as endMulticursorTransaction } from '../actions/endMulticursorTransaction'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { startMulticursorTransactionActionCreator as startMulticursorTransaction } from '../actions/startMulticursorTransaction'

// TODO: refactor
const MULTICURSOR_ACTIONS = new Set(['archiveThought', 'deleteThoughtWithCursor'])

/** Redux middleware for applying actions to all multicursors. */
const multicursorMiddleware: ThunkMiddleware<State> =
  ({ getState, dispatch }) =>
  next =>
  async action => {
    const state = getState()
    const { multicursors } = state

    // If the action should be applied to all multicursors
    if (
      !state.isMulticursorTransaction &&
      MULTICURSOR_ACTIONS.has(action.type) &&
      Object.keys(multicursors).length > 0
    ) {
      // Start the multicursor transaction
      await dispatch(startMulticursorTransaction())

      // Apply the action to each multicursor
      for (const path of Object.values(multicursors)) {
        // Set the cursor to the current multicursor path
        await dispatch(setCursor({ path }))

        // Dispatch the original action, augment the path.
        // TODO: ??
        await dispatch({ ...action, path })
      }

      // End the multicursor transaction
      await dispatch(endMulticursorTransaction())

      // Clear multicursors after the transaction
      await dispatch(clearMulticursors())

      // Don't proceed with the original action
      return
    }

    // For all other actions, proceed normally
    return next(action)
  }

export default multicursorMiddleware
