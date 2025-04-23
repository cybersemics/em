import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import actionMetadataStore, { ActionMetadata, SetCursorActionMetadata } from '../stores/actionMetadata'

interface SetCursorActionWithMetadata {
  metadata?: SetCursorActionMetadata
  type: 'setCursor'
}

// This can eventually be a discriminated union
export type ActionWithMetadata = SetCursorActionWithMetadata

const hasMetadata = (action: unknown): action is ActionWithMetadata => !!action && action.hasOwnProperty('metadata')

/** Action metadata should be ephemeral and must be updated for every action.
 * Update the actionMetadata store on every action, even if metadata is undefined. */
const updateActionMetadata: ThunkMiddleware<State> = () => {
  return next => action => {
    actionMetadataStore.update(
      hasMetadata(action) ? ({ type: action.type, ...action.metadata } as ActionMetadata) : { type: '' },
    )
    next(action)
  }
}

export default updateActionMetadata
