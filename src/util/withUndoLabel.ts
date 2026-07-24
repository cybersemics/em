import { UnknownAction } from 'redux'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Returns true if the value is a Redux action object. */
const isActionObject = (value: unknown): value is UnknownAction =>
  !!value && typeof value === 'object' && 'type' in value

/**
 * Annotates all Redux actions produced by an action, thunk, or action array with a user-facing undo label.
 * Explicit labels on nested actions take precedence.
 */
const withUndoLabel = <T>(action: T, undoLabel: string): T => {
  if (Array.isArray(action)) return action.map(item => withUndoLabel(item, undoLabel)) as T

  if (typeof action === 'function') {
    /** Annotates nested dispatches inside a thunk. */
    const dispatchWithLabel = (dispatch: Dispatch): Dispatch =>
      ((action: Parameters<Dispatch>[0]) => dispatch(withUndoLabel(action, undoLabel))) as Dispatch

    return ((dispatch: Dispatch, getState: () => State) =>
      (action as Thunk)(dispatchWithLabel(dispatch), getState)) as T
  }

  if (isActionObject(action)) {
    const actionUndoLabel = action.undoLabel
    return {
      ...action,
      undoLabel: typeof actionUndoLabel === 'string' ? actionUndoLabel : undoLabel,
    } as T
  }

  return action
}

/** Returns a dispatch function that annotates every dispatched action with the given undo label. */
export const dispatchWithUndoLabel = (dispatch: Dispatch, undoLabel: string): Dispatch =>
  ((action: Parameters<Dispatch>[0]) => dispatch(withUndoLabel(action, undoLabel))) as Dispatch

export default withUndoLabel
