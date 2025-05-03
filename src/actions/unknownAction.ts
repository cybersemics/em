import { Action } from 'redux'
import State from '../@types/State'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Handles an unknown action by printing an error if it is not a @@ Redux action. Returns state as-is. */
const unknownAction = (state: State, action: Action) => {
  if (!action.type.startsWith('@@')) {
    console.error('Unrecognized reducer:', action.type, action)
  }
  return state
}

export default unknownAction

// Register this action's metadata
registerActionMetadata('unknownAction', {
  undoable: false,
})
